// ==UserScript==
// @name        Download imitated image from twitter
// @namespace   suienzan
// @include     /^https:\/\/(mobile\.)?twitter\.com\//
// @version     1.1.0
// @author      suienzan
// @description DO NOT USE THIS SCRIPT IF YOU DON'T EXACTLY KNOW WHAT YOU ARE DOING!
// ==/UserScript==

// options
const removeButtonAfterDownload = true;

// scripts
const imageSelector = 'img[draggable="true"]:not([alt=""]';

const getFilename = (url) => (url ? url.split('/').pop().split('#').shift()
  .split('?')
  .shift() : null);

const removeButton = () => {
  const button = document.querySelector('[data-testid="download"]');
  if (button) button.closest('div + div').remove();
};

const download = (filename, href) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();

  if (removeButtonAfterDownload) removeButton();
};

// eslint-disable-next-line no-nested-ternary
const ditherRangeStart = (x) => (x < 8 ? 0 : x > 255 - 7 ? 255 - 15 : x - 7);

const dither = (x) => ditherRangeStart(x) + Math.floor(Math.random() * 16);

const ditherFisrtPixel = (ctx) => {
  const pixel = ctx.getImageData(0, 0, 1, 1);
  const {
    data: [r, g, b],
  } = pixel;

  const rgba = `rgba(${dither(r)}, ${dither(g)}, ${dither(b)}, 1)`;

  ctx.fillStyle = rgba;
  ctx.fillRect(0, 0, 1, 1);
};

// fetch image
const loadImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (err) => reject(err));
  image.src = url;
});

// imitate image and download
const imitateImage = async (image) => {
  const { src } = image;
  const filename = getFilename(src);

  const canvas = document.createElement('canvas');
  const { naturalWidth: width, naturalHeight: height } = image;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // try draw image from element
  ctx.drawImage(image, 0, 0, width, height);

  const pixelBuffer = new Uint32Array(
    ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
  );

  const isCanvasBlank = !pixelBuffer.some((color) => color !== 0);

  // Fetch image when element broken. Mainly caused by poor network.
  if (isCanvasBlank) {
    const fetchedImage = await loadImage(src);
    // draw image fetch source
    ctx.drawImage(fetchedImage, 0, 0, width, height);
  }

  ditherFisrtPixel(ctx);

  const dataUrl = canvas.toDataURL();

  download(filename, dataUrl);
};

const patchNode = (node, index) => {
  const newNode = node.cloneNode(true);
  const button = newNode.querySelector('[role="button"]');
  button.dataset.testid = 'download';
  button.dataset.index = index;
  button.ariaLabel = 'Download button';

  const svg = newNode.querySelector('svg');
  const g = svg.querySelector('g');
  g.innerHTML = '';

  const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  newPath.setAttribute('id', 'pathIdD');
  newPath.setAttribute('d', 'M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5');
  newPath.setAttribute('stroke', 'currentcolor');
  newPath.setAttribute('stroke-width', 2);
  newPath.setAttribute('fill', 'none');

  g.appendChild(newPath);

  svg.classList.remove('r-yyyyoo');
  return newNode;
};

const likeSelector = '[data-testid="like"]';

// Add a download button in the tweet
const addDownload = (index) => {
  const image = document.querySelectorAll(imageSelector)[index];
  if (!image) return;

  const like = document.querySelector(likeSelector).parentNode;
  const next = like.nextSibling;
  const button = next.querySelector('[role="button"]');

  const indexNotMatch = Number(button.dataset.index) !== index;
  const noDownload = button.dataset.testid !== 'download';

  if (noDownload || indexNotMatch) {
    const downloadNode = patchNode(next, index);
    image.crossOrigin = 'Anonymous';
    downloadNode.addEventListener('click', () => imitateImage(image));

    if (noDownload) {
      like.after(downloadNode);
      return;
    }
    next.replaceWith(downloadNode);
  }
};

const reg = /^https:\/\/(.*\.)?twitter.com\/.*\/status\/[0-9]+\/photo\/\d/;

// wait image & like button loaded
const newLikeObserver = (index) => {
  const likeObserver = new MutationObserver(() => {
    const image = document.querySelectorAll(imageSelector)[index];
    if (document.querySelector(likeSelector) && image && image.complete) {
      likeObserver.disconnect();
      addDownload(index);
    }
  });

  return likeObserver;
};

const config = { subtree: true, childList: true };

// Watch twitter location change
let oldHref = '';
const observer = new MutationObserver(() => {
  const { href } = window.location;
  if (href !== oldHref) {
    oldHref = href;
    const index = getFilename(href) - 1;
    if (reg.test(href)) {
      removeButton();
      newLikeObserver(index).observe(document.body, config);
    }
  }
});

observer.observe(document, config);
