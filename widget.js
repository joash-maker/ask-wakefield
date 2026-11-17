/** Ask Wakefield embed: the supported chat runs inside its own origin. */
(function(){
 'use strict';
 if(document.getElementById('aw-widget-btn'))return;
 const origin=document.currentScript?.src?new URL(document.currentScript.src).origin:'https://www.askwakefield.co.uk';
 function init(){
  if(document.getElementById('aw-widget-btn'))return;
  const style=document.createElement('style');style.textContent=`#aw-widget-btn{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border:0;border-radius:50%;background:#b9144c;color:white;font:700 18px system-ui;z-index:99998;cursor:pointer}#aw-widget-dialog{position:fixed;inset:auto 16px 88px auto;margin:0;padding:0;width:390px;max-width:calc(100vw - 32px);height:650px;max-height:calc(100dvh - 110px);border:1px solid #444;border-radius:16px;background:#17191c;color:white;overflow:hidden}#aw-widget-dialog::backdrop{background:#0005}#aw-widget-dialog header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;font:13px system-ui}#aw-widget-dialog a{color:#ffbad1}#aw-widget-close{min-width:44px;min-height:44px;background:transparent;color:white;border:1px solid #888;border-radius:8px}#aw-widget-frame{display:block;width:100%;height:calc(100% - 62px);border:0}#aw-widget-btn:focus-visible,#aw-widget-close:focus-visible{outline:3px solid #ffbad1;outline-offset:3px}`;document.head.appendChild(style);
  const button=document.createElement('button');button.id='aw-widget-btn';button.type='button';button.textContent='AW';button.setAttribute('aria-label','Open Ask Wakefield chat');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','aw-widget-dialog');button.setAttribute('aria-expanded','false');
  const dialog=document.createElement('dialog');dialog.id='aw-widget-dialog';dialog.setAttribute('aria-label','Ask Wakefield independent local assistant');
  const header=document.createElement('header');const link=document.createElement('a');link.href=origin+'/#assistant';link.target='_blank';link.rel='noopener';link.textContent='Open full chat';const close=document.createElement('button');close.type='button';close.id='aw-widget-close';close.textContent='Close';close.setAttribute('aria-label','Close Ask Wakefield chat');header.append(link,close);dialog.appendChild(header);
  const frame=document.createElement('iframe');frame.id='aw-widget-frame';frame.title='Ask Wakefield chat';frame.src=origin+'/?embed=1#assistant';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';dialog.appendChild(frame);
  function dismiss(){if(dialog.open)dialog.close();button.setAttribute('aria-expanded','false');button.focus();}
  button.addEventListener('click',()=>{if(dialog.open){dismiss();return;}dialog.showModal();button.setAttribute('aria-expanded','true');close.focus();});close.addEventListener('click',dismiss);dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus();});
  document.body.append(button,dialog);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
