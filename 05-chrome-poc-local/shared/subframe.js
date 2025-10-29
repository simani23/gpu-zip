// Receive parent frame message and resize iframe content
window.addEventListener("message", e => {
  if (!e.data || typeof e.data !== 'object') return;
  
  const scroll = document.getElementById("scroll");
  if (scroll && e.data.size) {
    scroll.style.transform = `scale(${e.data.size})`;
  }
  
  const innerframe = document.getElementById('frameinner');
  if (innerframe && e.data.size) {
    innerframe.style.width = e.data.size + 'px';
    innerframe.style.height = e.data.size + 'px';
  }
}, false);




