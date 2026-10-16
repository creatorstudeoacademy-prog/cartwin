/* CartWin Demo Popup - standalone for lumen-demo */
(function(){
"use strict";
if(window.__cartwinLoaded)return;window.__cartwinLoaded=true;
var CODE="COMEBACK10",PERCENT=10,DELAY=15;
function onCartPage(){return /^\/(cart|checkout)/.test(location.pathname);}
if(onCartPage())return;
try{if(sessionStorage.getItem("cw_shown")==="1")return;}catch(e){}
function show(){
  try{sessionStorage.setItem("cw_shown","1");}catch(e){}
  var o=document.createElement("div");
  o.id="cw-overlay";
  o.innerHTML='<div class="cw-card"><button class="cw-close" aria-label="Close">&times;</button><div class="cw-badge">Wait!</div><h2 class="cw-h">Get '+PERCENT+'% off your order</h2><p class="cw-sub">Use this code at checkout before you go:</p><button class="cw-code" id="cw-code">'+CODE+'</button><p class="cw-hint">Click the code to copy</p><a class="cw-cta" href="/discount/'+CODE+'?redirect=/checkout">Claim my '+PERCENT+'% off</a></div>';
  var s=document.createElement("style");
  s.textContent='#cw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;animation:cwIn .3s ease}#cw-overlay.cw-hide{display:none}.cw-card{position:relative;background:#0B0E17;color:#fff;border:1px solid #00E5FF;border-radius:16px;padding:36px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 0 60px rgba(0,229,255,.25)}.cw-close{position:absolute;top:12px;right:16px;background:none;border:none;color:#888;font-size:28px;cursor:pointer}.cw-close:hover{color:#fff}.cw-badge{display:inline-block;background:#00E5FF;color:#0B0E17;font-weight:700;font-size:12px;padding:4px 14px;border-radius:20px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}.cw-h{margin:0 0 10px;font-size:24px}.cw-sub{color:#aaa;margin:0 0 12px}.cw-code{display:block;width:100%;background:#1a1f2e;border:2px dashed #00E5FF;color:#00E5FF;font-size:22px;font-weight:700;letter-spacing:3px;padding:12px;border-radius:8px;cursor:pointer;margin:0 0 8px}.cw-hint{color:#666;font-size:12px;margin:0 0 16px}.cw-cta{display:inline-block;background:#00E5FF;color:#0B0E17;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px}.cw-cta:hover{opacity:.9}@keyframes cwIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}';
  document.head.appendChild(s);
  document.body.appendChild(o);
  o.querySelector(".cw-close").addEventListener("click",function(){o.classList.add("cw-hide");});
  o.addEventListener("click",function(e){if(e.target===o)o.classList.add("cw-hide");});
  document.getElementById("cw-code").addEventListener("click",function(){
    var t=this;
    if(navigator.clipboard){navigator.clipboard.writeText(CODE).then(function(){t.textContent="Copied!";setTimeout(function(){t.textContent=CODE;},1500);});}
  });
}
function armExit(){document.addEventListener("mouseout",function h(e){if(!e.relatedTarget&&e.clientY<=0){document.removeEventListener("mouseout",h);show();}});}
function armTimer(){setTimeout(show,DELAY*1000);}
fetch("/cart.js",{credentials:"same-origin"}).then(function(r){return r.json();}).then(function(c){
  if(!c||!c.item_count)return;
  armExit();armTimer();
}).catch(function(){});
})();
