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

var WH_CALLWNDPROC = 4;
var WM_QUIT =  0x0012;
var WM_CLOSE = 0x0010;
var GM = require('_GenericMarshal');

function WindowsMessagePump(options)
{
    this._ObjectID = 'win-message-pump';
    this._options = options;
    var emitterUtils = require('events').inherits(this);
    emitterUtils.createEvent('hwnd');
    emitterUtils.createEvent('error');
    emitterUtils.createEvent('message');
    emitterUtils.createEvent('exit');

    this._msg = GM.CreateVariable(GM.PointerSize == 4 ? 28 : 48);
    this._kernel32 = GM.CreateNativeProxy('Kernel32.dll');
    this._kernel32.mp = this;
    this._kernel32.CreateMethod('GetLastError');
    this._kernel32.CreateMethod('GetModuleHandleA');

    this._user32 = GM.CreateNativeProxy('User32.dll');
    this._user32.mp = this;
    this._user32.CreateMethod('CreateWindowExA');
    this._user32.CreateMethod('DefWindowProcA');
    this._user32.CreateMethod('DestroyWindow');
    this._user32.CreateMethod('DispatchMessageA');
    this._user32.CreateMethod('GetMessageA');
    this._user32.CreateMethod('PostMessageA');
    this._user32.CreateMethod('RegisterClassExA');
    this._user32.CreateMethod('SetWindowPos');
    this._user32.CreateMethod('ShowWindow');
    this._user32.CreateMethod('TranslateMessage');


    this.wndclass = GM.CreateVariable(GM.PointerSize == 4 ? 48 : 80);
    this.wndclass.mp = this;
    this.wndclass.hinstance = this._kernel32.GetModuleHandleA(0);
    this.wndclass.cname = GM.CreateVariable('MainWWWClass');
    this.wndclass.wndproc = GM.GetGenericGlobalCallback(4);
    this.wndclass.wndproc.mp = this;
    this.wndclass.toBuffer().writeUInt32LE(this.wndclass._size);
    this.wndclass.cname.pointerBuffer().copy(this.wndclass.Deref(GM.PointerSize == 4 ? 40 : 64, GM.PointerSize).toBuffer());
    this.wndclass.wndproc.pointerBuffer().copy(this.wndclass.Deref(8, GM.PointerSize).toBuffer());
    this.wndclass.hinstance.pointerBuffer().copy(this.wndclass.Deref(GM.PointerSize == 4 ? 20 : 24, GM.PointerSize).toBuffer());
    this.wndclass.wndproc.on('GlobalCallback', function onWndProc(xhwnd, xmsg, wparam, lparam)
    {
        if (this.mp._hwnd != null && this.mp._hwnd.Val == xhwnd.Val)
        {
            // This is for us
            var d = this.StartDispatcher();
            this.mp.emit('message', { message: xmsg.Val, wparam: wparam.Val, lparam: lparam.Val, lparam_hex: lparam.pointerBuffer().toString('hex'), lparam_raw: lparam, hwnd: xhwnd, dispatcher: d });

            var msgRet = this.mp.emit_returnValue('message');
            if (msgRet == null)
            {
                // We need to call DefWindowProcA, becuase this message was not handled
                var p = this.mp._user32.DefWindowProcA.async(d, xhwnd, xmsg, wparam, lparam);
                p.dispatcher = this;
                p.then(function (ret)
                {
                    this.dispatcher.EndDispatcher(ret);
                });
            }
            else
            {
                var r = GM.CreatePointer();
                r.Val = msgRet;
                this.EndDispatcher(r);
            }
        }
        else if(this.mp._hwnd == null && this.CallingThread() == this.mp._user32.RegisterClassExA.async.threadId())
        {
            // This message was generated from our CreateWindowExA method

            var d = this.StartDispatcher();

            this.mp.emit('message', { message: xmsg.Val, wparam: wparam.Val, lparam: lparam.Val, lparam_hex: lparam.pointerBuffer().toString('hex'), hwnd: xhwnd, dispatcher: d });

            var msgRet = this.mp.emit_returnValue('message');
            if (msgRet == null)
{
                // We need to call DefWindowProcA, becuase this message was not handled
                var p = this.mp._user32.DefWindowProcA.async(d, xhwnd, xmsg, wparam, lparam);
                p.dispatcher = this;
                p.then(function (ret)
                {
                    this.dispatcher.EndDispatcher(ret);
                });
            }
            else
            {
                var r = GM.CreatePointer();
                r.Val = msgRet;
                this.EndDispatcher(r);
            }
        }

        _debugGC();
    });

    this._user32.RegisterClassExA.async(this.wndclass).then(function ()
    {
        if (!this.nativeProxy.mp._options)  {   this.nativeProxy.mp._options = {};  }
        if (!this.nativeProxy.mp._options.window) { this.nativeProxy.mp._options.window = {}; }
        if (this.nativeProxy.mp._options.window.exstyles == null) { this.nativeProxy.mp._options.window.exstyles = 0x00000088; }    // TopMost Tool Window
        if (this.nativeProxy.mp._options.window.winstyles == null) { this.nativeProxy.mp._options.window.winstyles = 0x00800000; }  // WS_BORDER
        if (this.nativeProxy.mp._options.window.x == null) { this.nativeProxy.mp._options.window.x = 0; }
        if (this.nativeProxy.mp._options.window.y == null) { this.nativeProxy.mp._options.window.y = 0; }
        if (this.nativeProxy.mp._options.window.width == null) { this.nativeProxy.mp._options.window.width = 100; }
        if (this.nativeProxy.mp._options.window.height == null) { this.nativeProxy.mp._options.window.height = 100; }

        this.nativeProxy.CreateWindowExA.async(this.nativeProxy.RegisterClassExA.async, this.nativeProxy.mp._options.window.exstyles, this.nativeProxy.mp.wndclass.cname,
            this.nativeProxy.mp._options.window.title == null ? 0 : GM.CreateVariable(this.nativeProxy.mp._options.window.title), this.nativeProxy.mp._options.window.winstyles, this.nativeProxy.mp._options.window.x, this.nativeProxy.mp._options.window.y,
            this.nativeProxy.mp._options.window.width, this.nativeProxy.mp._options.window.height, 0, 0, 0, 0)
            .then(function(h)
            {
                if (h.Val == 0)
                {
                    // Error creating hidden window
                    this.nativeProxy.mp.emit('error', 'Error creating hidden window');
                }
                else
                {
                    this.nativeProxy.mp._hwnd = h;
                    this.nativeProxy.mp.emit('hwnd', h);
                    this.nativeProxy.mp._startPump();
                }
            });
    });
    this._startPump = function _startPump()
    {
        this._user32.GetMessageA.async(this._user32.RegisterClassExA.async, this._msg, this._hwnd, 0, 0).then(function (r)
        {
            if(r.Val > 0)
            {
                this.nativeProxy.TranslateMessage.async(this.nativeProxy.RegisterClassExA.async, this.nativeProxy.mp._msg).then(function ()
                {
                    this.nativeProxy.DispatchMessageA.async(this.nativeProxy.RegisterClassExA.async, this.nativeProxy.mp._msg).then(function ()
                    {
                        this.nativeProxy.mp._startPump();
                    });
                });
            }
            else
            {
                // We got a 'QUIT' message
                this.nativeProxy.DestroyWindow.async(this.nativeProxy.RegisterClassExA.async, this.nativeProxy.mp._hwnd).then(function ()
                {
                    this.nativeProxy.RegisterClassExA.async.abort();
                    delete this.nativeProxy.mp._hwnd;
                    this.nativeProxy.mp.emit('exit', 0);

                    this.nativeProxy.mp.wndclass.wndproc.removeAllListeners('GlobalCallback');
                    this.nativeProxy.mp.wndclass.wndproc = null;
                });
            }
        }, function (err) { this.nativeProxy.mp.stop(); });
    }

    this.stop = function stop()
    {
        if (this._hwnd)
        {
            this._user32.PostMessageA(this._hwnd, WM_QUIT, 0, 0);
        }
    };
    this.close = function close()
    {
        if (this._hwnd)
        {
            this._user32.PostMessageA(this._hwnd, WM_CLOSE, 0, 0);
        }
    };
}

module.exports = WindowsMessagePump;
module.exports.WindowStyles =
    {
        WS_BORDER: 0x00800000, WS_CAPTION: 0x00C00000, WS_CHILD: 0x40000000, WS_CHILDWINDOW: 0x40000000, WS_CLIPCHILDREN: 0x02000000,
        WS_CLIPSIBLINGS: 0x04000000, WS_DISABLED: 0x08000000, WS_DLGFRAME: 0x00400000, WS_GROUP: 0x00020000, WS_HSCROLL: 0x00100000,
        WS_ICONIC: 0x20000000, WS_MAXIMIZE: 0x01000000, WS_MAXIMIZEBOX: 0x00010000, WS_MINIMIZE: 0x20000000, WS_MINIMIZEBOX: 0x00020000,
        WS_OVERLAPPED: 0x00000000, WS_POPUP: 0x80000000, WS_SIZEBOX: 0x00040000, WS_SYSMENU: 0x00080000, WS_TABSTOP: 0x00010000,
        WS_THICKFRAME: 0x00040000, WS_TILED: 0x00000000, WS_VISIBLE: 0x10000000, WS_VSCROLL: 0x00200000
    };
module.exports.WindowStylesEx =
    {
        WS_EX_ACCEPTFILES: 0x00000010, WS_EX_APPWINDOW: 0x00040000, WS_EX_CLIENTEDGE: 0x00000200, WS_EX_COMPOSITED: 0x02000000,
        WS_EX_CONTEXTHELP: 0x00000400, WS_EX_CONTROLPARENT: 0x00010000, WS_EX_DLGMODALFRAME: 0x00000001, WS_EX_LAYERED: 0x0008000,
        WS_EX_LAYOUTRTL: 0x00400000, WS_EX_LEFT: 0x00000000, WS_EX_LEFTSCROLLBAR: 0x00004000, WS_EX_LTRREADING: 0x00000000,
        WS_EX_MDICHILD: 0x00000040, WS_EX_NOACTIVATE: 0x08000000, WS_EX_NOINHERITLAYOUT: 0x00100000, WS_EX_NOPARENTNOTIFY: 0x00000004,
        WS_EX_NOREDIRECTIONBITMAP: 0x00200000, WS_EX_RIGHT: 0x00001000, WS_EX_RIGHTSCROLLBAR: 0x00000000, WS_EX_RTLREADING: 0x00002000,
        WS_EX_STATICEDGE: 0x00020000, WS_EX_TOOLWINDOW: 0x00000080, WS_EX_TOPMOST: 0x00000008, WS_EX_TRANSPARENT: 0x00000020, WS_EX_WINDOWEDGE: 0x00000100
    };
