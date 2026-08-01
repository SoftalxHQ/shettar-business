/** Inline script source that rewrites Tauri Android HMR WebSockets to the LAN host. */
export function tauriHmrBridgeInlineScript(host: string, port = "3001"): string {
  return `(function(){
  var host=${JSON.stringify(host)};
  var port=${JSON.stringify(port)};
  if(!host||typeof WebSocket==="undefined")return;
  var Orig=WebSocket;
  function rewrite(url){
    try{
      var u=String(url);
      if(u.indexOf("tauri.localhost")===-1)return url;
      if(u.indexOf("_next")===-1&&u.indexOf("webpack-hmr")===-1)return url;
      return u
        .replace(/wss:\\/\\/tauri\\.localhost(?::\\d+)?/g,"ws://"+host+":"+port)
        .replace(/ws:\\/\\/tauri\\.localhost(?::\\d+)?/g,"ws://"+host+":"+port)
        .replace(/https:\\/\\/tauri\\.localhost(?::\\d+)?/g,"http://"+host+":"+port)
        .replace(/http:\\/\\/tauri\\.localhost(?::\\d+)?/g,"http://"+host+":"+port);
    }catch(e){return url;}
  }
  function PatchedWebSocket(url,protocols){
    var next=rewrite(url);
    if(next!==url&&typeof console!=="undefined"){
      console.info("[shettar] HMR socket",url,"->",next);
    }
    if(protocols===undefined)return new Orig(next);
    return new Orig(next,protocols);
  }
  PatchedWebSocket.prototype=Orig.prototype;
  PatchedWebSocket.CONNECTING=Orig.CONNECTING;
  PatchedWebSocket.OPEN=Orig.OPEN;
  PatchedWebSocket.CLOSING=Orig.CLOSING;
  PatchedWebSocket.CLOSED=Orig.CLOSED;
  window.WebSocket=PatchedWebSocket;
})();`
}
