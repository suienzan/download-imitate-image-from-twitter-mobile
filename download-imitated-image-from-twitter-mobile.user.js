// ==UserScript==
// @name        Download imitated image from twitter mobile
// @namespace   suienzan
// @match       https://mobile.twitter.com/*
// @version     0.1.0
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
  if (button) button.parentNode.remove();
};

const download = (filename, href) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();

  if (removeButtonAfterDownload) removeButton();
};

const dither = (x) => Math.floor(x + Math.random() * 16 - 16 / 2 + 256) % 256;

const ditherFisrtPixel = (ctx) => {
  const pixel = ctx.getImageData(0, 0, 1, 1);
  const {
    data: [r, g, b],
  } = pixel;

  const rgba = `rgba(${dither(r)}, ${dither(g)}, ${dither(b)}, 1)`;

  ctx.fillStyle = rgba;
  ctx.fillRect(0, 0, 1, 1);
};

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

  ctx.drawImage(image, 0, 0, width, height);
  ditherFisrtPixel(ctx);

  download(filename, canvas.toDataURL());
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

let interval = null;

// Add a download button in the tweet
const addDownload = (index) => {
  const image = document.querySelectorAll(imageSelector)[index];
  if (!image) return;

  clearInterval(interval);
  const like = document.querySelector('[data-testid="like"]').parentNode;
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

let oldHref = '';

// Watch twitter location change
const observer = new MutationObserver(() => {
  const { href } = window.location;
  if (href !== oldHref) {
    oldHref = href;
    if (reg.test(href)) {
      removeButton();

      const index = getFilename(href) - 1;

      interval = setInterval(() => {
        addDownload(index);
      }, 1000);
    }
  }
});

const config = { subtree: true, childList: true };
observer.observe(document, config);
