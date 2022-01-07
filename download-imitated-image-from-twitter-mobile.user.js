// ==UserScript==
// @name        Download imitated image from twitter mobile
// @namespace   suienzan
// @match       https://mobile.twitter.com/*
// @version     0.0.0
// @author      suienzan
// @description DO NOT USE THIS SCRIPT IF YOU DON'T EXACTLY KNOW WHAT YOU ARE DOING!
// ==/UserScript==

const imageSelector = 'img[draggable="true"]:not([alt=""]';

const getFilename = (url) => (url ? url.split('/').pop().split('#').shift()
  .split('?')
  .shift() : null);

const download = (filename, href) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
};

// imitate image and download
const imitateImage = async (url) => {
  const filename = getFilename(url);
  const blob = await fetch(url).then((response) => response.blob());
  const blobURL = window.URL.createObjectURL(blob);

  const image = new Image();
  await new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = blobURL;
  });

  const canvas = document.createElement('canvas');
  const { width, height } = image;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, width, height);
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
  const { src } = image;
  const like = document.querySelector('[data-testid="like"]').parentNode;
  const next = like.nextSibling;
  const button = next.querySelector('[role="button"]');

  const indexNotMatch = Number(button.dataset.index) !== index;

  const noDownload = button.dataset.testid !== 'download';

  if (noDownload || indexNotMatch) {
    const downloadNode = patchNode(next, index);
    downloadNode.addEventListener('click', () => imitateImage(src));

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
      const index = getFilename(href) - 1;

      interval = setInterval(() => {
        addDownload(index);
      }, 1000);
    }
  }
});

const config = { subtree: true, childList: true };
observer.observe(document, config);
