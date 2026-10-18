const gallery = document.createElement('dialog');
gallery.className = 'gallery-lightbox';
gallery.setAttribute('aria-label', 'Expanded project image');
gallery.innerHTML = '<button type="button" aria-label="Close image">×</button><img alt="">';
document.body.append(gallery);

const galleryImage = gallery.querySelector('img');
const closeButton = gallery.querySelector('button');
let lastImage = null;

function openImage(image) {
  lastImage = image;
  galleryImage.src = image.currentSrc || image.src;
  galleryImage.alt = image.alt;
  gallery.showModal();
  closeButton.focus();
}

document.querySelectorAll('.project-cover > img, .story-figure img').forEach(image => {
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', `Enlarge image: ${image.alt || 'project cover'}`);
  image.addEventListener('click', () => openImage(image));
  image.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openImage(image);
    }
  });
});

closeButton.addEventListener('click', () => gallery.close());
gallery.addEventListener('keydown', event => {
  if (event.key === 'Escape') gallery.close();
});
gallery.addEventListener('click', event => {
  if (event.target === gallery) gallery.close();
});
gallery.addEventListener('close', () => {
  galleryImage.removeAttribute('src');
  lastImage?.focus();
});
