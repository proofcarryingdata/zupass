async function start() {
  alert("starting container");
  
  window.addEventListener('message', function(event) {
    alert("Message received from the child: " + event.data);
  });

  setTimeout(() => {
    const iframe = document.querySelector("#root") as HTMLIFrameElement;
    iframe.contentWindow.postMessage("This is a message from the container", "*");
  }, 1000)
}

start();