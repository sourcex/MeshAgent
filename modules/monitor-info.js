/*
Copyright 2018 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var promise = require('promise');
var PPosition = 4;
var PSize = 8;
var PMinSize = 1 << 4;
var PMaxSize = 1 << 5;
var _NET_WM_STATE_REMOVE = 0;    // remove/unset property
var _NET_WM_STATE_ADD = 1;    // add/set property
var _NET_WM_STATE_TOGGLE = 2;    // toggle property
var SubstructureRedirectMask = (1 << 20);
var SubstructureNotifyMask = (1 << 19);
var PropModeReplace = 0;
var XA_ATOM = 4;
var MWM_HINTS_FUNCTIONS = (1 << 0);
var MWM_HINTS_DECORATIONS = (1 << 1);
var ClientMessage = 33;

function getLibInfo(libname)
{
    if (process.platform != 'linux') { throw ('Only supported on linux'); }

    var child = require('child_process').execFile('/bin/sh', ['sh']);
    child.stdout.str = '';
    child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
    child.stdin.write("whereis ldconfig | awk '{ print $2 }'\nexit\n");
    child.waitExit();

    var ldconfig = child.stdout.str.trim();

    child = require('child_process').execFile('/bin/sh', ['sh']);
    child.stdout.str = '';
    child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
    child.stdin.write(ldconfig + " -p | grep '" + libname + ".so.' | tr '\\n' '^' | awk -F^ '{ printf \"[\"; for(i=1;i<=NF;++i) {" + ' split($i, plat, ")"); split(plat[1], plat2, "("); ifox=split(plat2[2], ifo, ","); libc=""; hwcap="0"; for(ifoi=1;ifoi<=ifox;++ifoi) { if(split(ifo[ifoi], jnk, "libc")==2) { libc=ifo[ifoi]; } if(split(ifo[ifoi], jnk, "hwcap:")==2) { split(ifo[ifoi], jnk, "0x"); hwcap=jnk[2]; }   }      x=split($i, tok, " "); if(tok[1]!="") { printf "%s{\\"lib\\": \\"%s\\", \\"path\\": \\"%s\\", \\"hwcap\\": \\"%s\\", \\"libc\\": \\"%s\\"}", (i!=1?",":""), tok[1], tok[x], hwcap, libc; }} printf "]"; }\'\nexit\n');

    child.waitExit();
    var v = JSON.parse(child.stdout.str.trim());
    return (v);
}

function monitorinfo()
{
    this._ObjectID = 'monitor-info';
    this._gm = require('_GenericMarshal');

    if (process.platform == 'win32')
    {
        this._user32 = this._gm.CreateNativeProxy('user32.dll');
        this._user32.CreateMethod('EnumDisplayMonitors');
        this._kernel32 = this._gm.CreateNativeProxy('kernel32.dll');
        this._kernel32.CreateMethod('GetLastError');

        this.getInfo = function getInfo()
        {
            var info = this;
            return (new promise(function (resolver, rejector) {
                this._monitorinfo = { resolver: resolver, rejector: rejector, self: info, callback: info._gm.GetGenericGlobalCallback(4) };
                this._monitorinfo.callback.info = this._monitorinfo;
                this._monitorinfo.dwData = info._gm.ObjectToPtr(this._monitorinfo);

                this._monitorinfo.callback.results = [];
                this._monitorinfo.callback.on('GlobalCallback', function OnMonitorInfo(hmon, hdc, r, user) {
                    if (this.ObjectToPtr_Verify(this.info, user)) {
                        var rb = r.Deref(0, 16).toBuffer();
                        this.results.push({ left: rb.readInt32LE(0), top: rb.readInt32LE(4), right: rb.readInt32LE(8), bottom: rb.readInt32LE(12) });

                        var r = this.info.self._gm.CreateInteger();
                        r.Val = 1;
                        return (r);
                    }
                });

                if (info._user32.EnumDisplayMonitors(0, 0, this._monitorinfo.callback, this._monitorinfo.dwData).Val == 0) {
                    rejector('LastError=' + info._kernel32.GetLastError().Val);
                    return;
                }
                else {
                    resolver(this._monitorinfo.callback.results);
                }

            }));
        }
    }
    else if (process.platform == 'linux')
    {
        // First thing we need to do, is determine where the X11 libraries are

        // Sufficient access rights to use ldconfig
        var x11info = getLibInfo('libX11');
        var xtstinfo = getLibInfo('libXtst');
        var xextinfo = getLibInfo('libXext');
        var xfixesinfo = getLibInfo('libXfixes');
        var ix;

        for (ix in x11info)
        {
            if (x11info.length == 1 || x11info[ix].hwcap == "0")
            {
                try
                {
                    this._gm.CreateNativeProxy(x11info[ix].path);
                    Object.defineProperty(this, 'Location_X11LIB', { value: x11info[ix].path });
                    break;
                }
                catch (ex)
                {
                }
            }
        }
        for (ix in xtstinfo)
        {
            if (xtstinfo.length == 1 || xtstinfo[ix].hwcap == "0")
            {
                try
                {
                    this._gm.CreateNativeProxy(xtstinfo[ix].path);
                    Object.defineProperty(this, 'Location_X11TST', { value: xtstinfo[ix].path });
                    break;
                }
                catch (ex)
                {
                }
            }
        }
        for (ix in xextinfo)
        {
            if (xextinfo.length == 1 || xextinfo[ix].hwcap == "0")
            {
                try
                {
                    this._gm.CreateNativeProxy(xextinfo[ix].path);
                    Object.defineProperty(this, 'Location_X11EXT', { value: xextinfo[ix].path });
                    break;
                }
                catch (ex)
                {
                }
            }
        }
        for (ix in xfixesinfo)
        {
            if (xfixesinfo.length == 1 || xfixesinfo[ix].hwcap == "0")
            {
                try
                {
                    this._gm.CreateNativeProxy(xfixesinfo[ix].path);
                    Object.defineProperty(this, 'Location_X11FIXES', { value: xfixesinfo[ix].path });
                    break;
                }
                catch (ex)
                {
                }
            }
        }   

        try
        {
            if (process.env['Location_X11LIB']) { Object.defineProperty(this, 'Location_X11LIB', { value: process.env['Location_X11LIB'] }); }
            if (process.env['Location_X11TST']) { Object.defineProperty(this, 'Location_X11TST', { value: process.env['Location_X11TST'] }); }
            if (process.env['Location_X11EXT']) { Object.defineProperty(this, 'Location_X11EXT', { value: process.env['Location_X11EXT'] }); }
            if (process.env['Location_X11FIXES']) { Object.defineProperty(this, 'Location_X11FIXES', { value: process.env['Location_X11FIXES'] }); }
        }
        catch(ex)
        {
        }
    }
    if(process.platform == 'freebsd')
    {
	    Object.defineProperty(this, 'Location_X11LIB', { value: require('lib-finder')('libX11')[0]?require('lib-finder')('libX11')[0].location: undefined });
	    Object.defineProperty(this, 'Location_X11TST', { value: require('lib-finder')('libXtst')[0]?require('lib-finder')('libXtst')[0].location:undefined });
	    Object.defineProperty(this, 'Location_X11EXT', { value: require('lib-finder')('libXext')[0] ? require('lib-finder')('libXext')[0].location : undefined });
	    Object.defineProperty(this, 'Location_X11FIXES', { value: require('lib-finder')('libXfixes')[0] ? require('lib-finder')('libXfixes')[0].location : undefined });
    }

    if(process.platform == 'linux' || process.platform == 'freebsd')
    {
        this.MOTIF_FLAGS = 
        {
            MWM_FUNC_ALL        : (1 << 0) ,
            MWM_FUNC_RESIZE     : (1 << 1) ,
            MWM_FUNC_MOVE       : (1 << 2) ,
            MWM_FUNC_MINIMIZE   : (1 << 3) ,
            MWM_FUNC_MAXIMIZE   : (1 << 4) ,
            MWM_FUNC_CLOSE      : (1 << 5) 
        };


        if (this.Location_X11LIB && this.Location_X11TST && this.Location_X11EXT)
        {
            var ch = require('child_process').execFile('/bin/sh', ['sh']);
            ch.stderr.on('data', function () { });
            ch.stdout.str = ''; ch.stdout.on('data', function (c) { this.str += c.toString(); });
            ch.stdin.write('ps -e | grep X\nexit\n');
            ch.waitExit();
            Object.defineProperty(this, 'kvm_x11_support', { value: ch.stdout.str.trim() == '' ? false : true });
        }
        else
        {
            Object.defineProperty(this, 'kvm_x11_support', { value: false });
        }


        if (this.Location_X11LIB)
        {
            this._X11 = this._gm.CreateNativeProxy(this.Location_X11LIB);
            this._X11.CreateMethod('XChangeProperty');
            this._X11.CreateMethod('XCloseDisplay');
            this._X11.CreateMethod('XConnectionNumber');
            this._X11.CreateMethod('XConvertSelection');
            this._X11.CreateMethod('XCreateGC');
            this._X11.CreateMethod('XCreateWindow');
            this._X11.CreateMethod('XCreateSimpleWindow');
            this._X11.CreateMethod('XDefaultColormap');
            this._X11.CreateMethod('XDefaultScreen');
            this._X11.CreateMethod('XDestroyWindow');
            this._X11.CreateMethod('XDrawLine');
            this._X11.CreateMethod('XDisplayHeight');
            this._X11.CreateMethod('XDisplayWidth');
            this._X11.CreateMethod('XFetchName');
            this._X11.CreateMethod('XFlush');
            this._X11.CreateMethod('XFree');
            this._X11.CreateMethod('XCreateGC');
            this._X11.CreateMethod('XGetAtomName');
            this._X11.CreateMethod('XGetWindowProperty');
            this._X11.CreateMethod('XInternAtom');
            this._X11.CreateMethod('XMapWindow');
            this._X11.CreateMethod({ method: 'XNextEvent', threadDispatch: true });
            this._X11.CreateMethod({ method: 'XNextEvent', newName: 'XNextEventSync' });
            this._X11.CreateMethod('XOpenDisplay');
            this._X11.CreateMethod('XPending');
            this._X11.CreateMethod('XRootWindow');
            this._X11.CreateMethod('XSelectInput');
            this._X11.CreateMethod('XScreenCount');
            this._X11.CreateMethod('XScreenOfDisplay');
            this._X11.CreateMethod('XSelectInput');
            this._X11.CreateMethod('XSendEvent');
            this._X11.CreateMethod('XSetForeground');
            this._X11.CreateMethod('XSetFunction');
            this._X11.CreateMethod('XSetLineAttributes');
            this._X11.CreateMethod('XSetNormalHints');
            this._X11.CreateMethod('XSetSelectionOwner');
            this._X11.CreateMethod('XSetSubwindowMode');
            this._X11.CreateMethod('XSetWMProtocols');
            this._X11.CreateMethod('XStoreName');
            this._X11.CreateMethod('XSync');
            this._X11.CreateMethod('XBlackPixel');
            this._X11.CreateMethod('XWhitePixel');
        }

        this.isUnity = function isUnity()
        {
            return (process.env['XDG_CURRENT_DESKTOP'] == 'Unity');
        }

        this.unDecorateWindow = function unDecorateWindow(display, window)
        {
            var MwmHints = this._gm.CreateVariable(40);
            var mwmHintsProperty = this._X11.XInternAtom(display, this._gm.CreateVariable('_MOTIF_WM_HINTS'), 0);
            MwmHints.Deref(0, 4).toBuffer().writeUInt32LE(1 << 1);
            this._X11.XChangeProperty(display, window, mwmHintsProperty, mwmHintsProperty, 32, 0, MwmHints, 5);
        }
        this.setAllowedActions = function setAllowedActions(display, window, flags)
        {
            /*
                MWM_HINTS_FUNCTIONS = (1L << 0),
                MWM_HINTS_DECORATIONS =  (1L << 1),

                MWM_FUNC_ALL = (1L << 0),
                MWM_FUNC_RESIZE = (1L << 1),
                MWM_FUNC_MOVE = (1L << 2),
                MWM_FUNC_MINIMIZE = (1L << 3),
                MWM_FUNC_MAXIMIZE = (1L << 4),
                MWM_FUNC_CLOSE = (1L << 5)
            */

            var MwmHints = this._gm.CreateVariable(40);
            var mwmHintsProperty = this._X11.XInternAtom(display, this._gm.CreateVariable('_MOTIF_WM_HINTS'), 0);

            MwmHints.Deref(0, 4).toBuffer().writeUInt32LE(MWM_HINTS_FUNCTIONS);
            MwmHints.Deref(this._gm.PointerSize, 4).toBuffer().writeUInt32LE(flags);

            this._X11.XChangeProperty(display, window, mwmHintsProperty, mwmHintsProperty, 32, PropModeReplace, MwmHints, 5);
        }
        this.setWindowSizeHints = function setWindowSizeHints(display, window, x, y, width, height, minWidth, minHeight, maxWidth, maxHeight)
        {
            var sizeHints = this._gm.CreateVariable(80);
            var spec = PPosition | PSize;
            if (minWidth != null && minHeight != null) { spec |= PMinSize; }
            if (maxWidth != null && maxHeight != null) { spec |= PMaxSize; }

            sizeHints.Deref(0, 4).toBuffer().writeUInt32LE(spec);
            sizeHints.Deref(this._gm.PointerSize, 4).toBuffer().writeUInt32LE(x);
            sizeHints.Deref(this._gm.PointerSize + 4, 4).toBuffer().writeUInt32LE(y);
            sizeHints.Deref(this._gm.PointerSize + 8, 4).toBuffer().writeUInt32LE(width);
            sizeHints.Deref(this._gm.PointerSize + 12, 4).toBuffer().writeUInt32LE(height);
            if (minWidth != null) { sizeHints.Deref(this._gm.PointerSize + 16, 4).toBuffer().writeUInt32LE(minWidth); }
            if (minHeight != null) { sizeHints.Deref(this._gm.PointerSize + 20, 4).toBuffer().writeUInt32LE(minHeight); }
            if (maxWidth != null) { sizeHints.Deref(this._gm.PointerSize + 24, 4).toBuffer().writeUInt32LE(maxWidth); }
            if (maxHeight != null) { sizeHints.Deref(this._gm.PointerSize + 28, 4).toBuffer().writeUInt32LE(maxHeight); }

            this._X11.XSetNormalHints(display, window, sizeHints);
        }
        this.setAlwaysOnTop = function setAlwaysOnTop(display, rootWindow, window)
        {
            var wmNetWmState = this._X11.XInternAtom(display, this._gm.CreateVariable('_NET_WM_STATE'), 1);
            var wmStateAbove = this._X11.XInternAtom(display, this._gm.CreateVariable('_NET_WM_STATE_ABOVE'), 1);

            var xclient = this._gm.CreateVariable(96);
            xclient.Deref(0, 4).toBuffer().writeUInt32LE(33);                   // ClientMessage type
            xclient.Deref(this._gm.PointerSize == 8 ? 48 : 24, 4).toBuffer().writeUInt32LE(32);   // Format 32
            wmNetWmState.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize == 8 ? 40 : 20, this._gm.PointerSize).toBuffer()); // message_type
            xclient.Deref(this._gm.PointerSize == 8 ? 56 : 28, this._gm.PointerSize).toBuffer().writeUInt32LE(_NET_WM_STATE_ADD);   // data.l[0]
            wmStateAbove.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize == 8 ? 64 : 32, this._gm.PointerSize).toBuffer());  // data.l[1]
            window.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize == 8 ? 32 : 16, this._gm.PointerSize).toBuffer());       // window
            this._X11.XSendEvent(display, rootWindow, 0, SubstructureRedirectMask | SubstructureNotifyMask, xclient);
        }
        this.hideWindowIcon = function hideWindowIcon(display, rootWindow, window)
        {
            var wmNetWmState = this._X11.XInternAtom(display, this._gm.CreateVariable('_NET_WM_STATE'), 1);
            var wmStateSkip = this._X11.XInternAtom(display, this._gm.CreateVariable('_NET_WM_STATE_SKIP_TASKBAR'), 1);

            var xclient = this._gm.CreateVariable(96);
            xclient.Deref(0, 4).toBuffer().writeUInt32LE(33);                               // ClientMessage type
            xclient.Deref(this._gm.PointerSize==8?48:24, 4).toBuffer().writeUInt32LE(32);   // Format 32
            wmNetWmState.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize==8?40:20, this._gm.PointerSize).toBuffer()); // message_type
            xclient.Deref(this._gm.PointerSize==8?56:28, this._gm.PointerSize).toBuffer().writeUInt32LE(_NET_WM_STATE_ADD);   // data.l[0]
            wmStateSkip.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize==8?64:32, this._gm.PointerSize).toBuffer());  // data.l[1]

            window.pointerBuffer().copy(xclient.Deref(this._gm.PointerSize==8?32:16, this._gm.PointerSize).toBuffer());       // window
            this._X11.XSendEvent(display, rootWindow, 0, SubstructureRedirectMask | SubstructureNotifyMask, xclient);
        }

        this.getInfo = function getInfo()
        {
            var info = this;
            var ret = new promise(function (res, rej) { this._res = res; this._rej = rej; });
            ret.parent = this;

            if (!process.env.XAUTHORITY || !process.env.DISPLAY)
            {
                var xinfo = this.getXInfo(require('user-sessions').getUid(require('user-sessions').whoami()));
                process.setenv('XAUTHORITY', xinfo.xauthority);
                process.setenv('DISPLAY', xinfo.display);
            }

            var display = info._X11.XOpenDisplay(info._gm.CreateVariable(process.env.DISPLAY));
            if (display.Val == 0)
            {
                require('fs').writeFileSync('/var/tmp/agentSlave', 'XOpenDisplay Failed', { flags: 'a' });
                ret._rej('XOpenDisplay Failed');
                return (ret);
            }

            var screenCount = info._X11.XScreenCount(display).Val;
            var ifo = [];
            for(var i=0;i<screenCount;++i)
            {
                var screen = info._X11.XScreenOfDisplay(display, i);
                ifo.push({ left: 0, top: 0, right: info._X11.XDisplayWidth(display, i).Val, bottom: info._X11.XDisplayHeight(display, i).Val, screen: screen, screenId: i, display: display });
            }
            ret._res(ifo);

            return (ret);
        }
        this.getXInfo = function getXInfo(consoleuid)
        {
            var ret = null;
            var uname = require('user-sessions').getUsername(consoleuid);
            var child = require('child_process').execFile('/bin/sh', ['sh']);
            child.stdout.str = '';
            child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
            child.stdin.write("ps " + (process.platform == 'freebsd'?"-ax ":"") + "-e -o user" + (process.platform=='linux'?":999":"") + " -o tty -o command | grep X | awk '{ split($0, a, \"-auth\"); split(a[2], b, \" \"); if($1==\"" + uname + "\" && b[1]!=\"\") { printf \"%s,%s,%s\",$1,$2,b[1] } }'\nexit\n");
            child.waitExit();
            var tokens = child.stdout.str.trim().split(',');
            if (tokens.length == 3)
            {
                ret = { tty: tokens[1], xauthority: tokens[2], exportEnv: exportEnv };
            }

            if (ret == null)
            {
                // This Linux Distro does not spawn an XServer instance in the user session, that specifies the XAUTHORITY.
                // So we're going to brute force it, by enumerating all processes owned by this user, and inspect the environment variables
                var child = require('child_process').execFile('/bin/sh', ['sh']);
                child.stdout.str = '';
                child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
                child.stdin.write("ps " + (process.platform=='freebsd'?"-ax ":"") + "-e -o pid -o user | grep " + uname + " | awk '{ print $1 }'\nexit\n");
                child.waitExit();

                var lines = child.stdout.str.split('\n');
                for(var n in lines)
                {
                    var ln = lines[n].trim();
                    if(ln.length>0)
                    {
                        var e = require('user-sessions').getEnvFromPid(ln);
                        if(e.XAUTHORITY && e.DISPLAY)
                        {
                            ret = { tty: '?', xauthority: e.XAUTHORITY, display: e.DISPLAY, exportEnv: exportEnv };
                            return (ret);
                        }
                    }
                }
                if(ret == null)
                {
                    // We couldn't find XAUTHORITY and DISPLAY, so as a last ditch effort, lets just look for DISPLAY
                    for (var n in lines)
                    {
                        var ln = lines[n].trim();
                        if (ln.length > 0)
                        {
                            var e = require('user-sessions').getEnvFromPid(ln);
                            if (e.DISPLAY)
                            {
                                ret = { tty: '?', display: e.DISPLAY, exportEnv: exportEnv };
                                return (ret);
                            }
                        }
                    }
                }
            }
            else
            {
                // We need to find $DISPLAY by looking at all the processes running on the same tty as the XServer instance for this user session
                child = require('child_process').execFile('/bin/sh', ['sh']);
                child.stdout.str = '';
                child.stdout.on('data', function (chunk) { this.str += chunk.toString(); });
                child.stdin.write("ps -e -o tty -o pid -o user:9999 | grep " + ret.tty + " | grep " + uname + " | awk '{ print $2 }' \nexit\n");
                child.waitExit();

                var lines = child.stdout.str.split('\n');
                var ps, psx, v, vs = 0;
                for(var x in lines)
                {
                    if(lines[x].trim().length>0)
                    {
                        try
                        {
                            ps = require('fs').readFileSync('/proc/' + lines[x].trim() + '/environ');
                        }
                        catch(pse)
                        {
                            continue;
                        }
                        vs = 0;
                        for(psx=0;psx<ps.length;++psx)
                        {
                            if (ps[psx] == 0)
                            {
                                v = ps.slice(vs, psx).toString().split('=');
                                if (v[0] == 'DISPLAY')
                                {
                                    ret.display = v[1];
                                    return (ret);
                                }
                                vs = psx + 1;
                            }
                        }
                    }
                }
            }
            return (ret);
        };
    }
}

function exportEnv()
{
    var r =
        {
            XAUTHORITY: this.xauthority?this.xauthority:"", DISPLAY: this.display,
            Location_X11LIB: require('monitor-info').Location_X11LIB,
            Location_X11TST: require('monitor-info').Location_X11TST,
            Location_X11EXT: require('monitor-info').Location_X11EXT,
            Location_X11FIXES: require('monitor-info').Location_X11FIXES
        };
    return (r);
}

if (process.platform != 'darwin')
{
    module.exports = new monitorinfo();
}

if (process.platform == 'linux')
{
    module.exports.getLibInfo = getLibInfo;
}
