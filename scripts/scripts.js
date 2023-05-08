import {
  sampleRUM,
  buildBlock,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS, createOptimizedPicture,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

async function addLoopingContent(main, apiResponse) {
  const ads = apiResponse.data;
  const carousel = document.createElement('div');
  carousel.className = 'carousel slide';
  carousel.id='colesdemo';
  // carousel.setAttribute('data-ride', 'carousel');
  carousel.setAttribute('data-interval', '15000');
  carousel.setAttribute('data-keyboard', 'false');
  carousel.setAttribute('data-pause', 'false');

  const carouselInner = document.createElement('div');
  carouselInner.className = 'carousel-inner';

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < ads.length; i++) {
    const carouselItem = document.createElement('div');
    carouselItem.className = (i === 0) ? 'carousel-item active' : 'carousel-item';
    carouselItem.setAttribute('data-interval', (ads[i]['Duration'] * 1000).toString());

    const isVideo = ads[i]['Published Link'].endsWith('.mp4');
    if (isVideo) {
      const carouselVideo = document.createElement('video');
      carouselVideo.setAttribute('src', ads[i]['Published Link']);
      carouselVideo.className = 'd-flex w-100';
      let carouselVideoSource = document.createElement('source');
      carouselVideoSource.setAttribute('src', ads[i]['Published Link']);
      carouselVideoSource.setAttribute('type', 'video/mp4');
      //carouselVideo.setAttribute('autoplay', 'autoplay');
      //carouselVideo.setAttribute('loop', 'loop');
      carouselVideo.appendChild(carouselVideoSource);
      carouselItem.appendChild(carouselVideo);
    } else {
      const carouselImage = createOptimizedPicture(ads[i]['Published Link'], '', true);
      carouselImage.className = 'd-flex';
      carouselItem.appendChild(carouselImage);
    }
    carouselInner.appendChild(carouselItem);
  }
  carousel.appendChild(carouselInner);
  main.replaceChild(carousel, document.querySelector('div'));
  $('.carousel').carousel();
  carouselInterval();
  videoPlay();
}

function videoPlay() {
  $('#colesdemo').on('slid.bs.carousel', function () {
    if($('#colesdemo').find('.active').children()[0].nodeName=='VIDEO'){
      let vid = $('#colesdemo').find('.active').children()[0];
      vid.muted = true;
      vid.play();
    }
  })
}

function carouselInterval() {
  let t;
  let start = $('#colesdemo').find('.active').attr('data-interval');
  t = setTimeout("$('#colesdemo').carousel({interval: 1000});", start-1000);

  $('#colesdemo').on('slid.bs.carousel', function () {
    clearTimeout(t);
    var duration = $(this).find('.active').attr('data-interval');

    $('#colesdemo').carousel('pause');
    t = setTimeout("$('#colesdemo').carousel();", duration-1000);
  })
}

async function pollAPI(main, fn, url, interval, previousResponse) {
  try {
    const response = await fetch(url);
    const apiResponse = await response.json();
    if (response.status === 200 && !_.isEqual(apiResponse, previousResponse)) {
      // eslint-disable-next-line no-param-reassign
      previousResponse = apiResponse;
      console.log(` API response received: ${JSON.stringify(apiResponse)}`);
      fn(main, apiResponse);
    }
  } finally {
    setTimeout(() => {
      pollAPI(main, fn, url, interval, previousResponse);
    }, interval);
  }
}

const poll = (main, fn, url) => {
  let interval = localStorage.getItem('franklinPollInterval');
  if (!interval) {
    interval = 10000;
  }
  if (!url) {
    // eslint-disable-next-line no-param-reassign
    // test change
    // url = 'https://288650-franklinecolesdemo-stage.adobeio-static.net/api/v1/web/franklin_coles_demo/playlist';
    url = 'https://288650-257ambermackerel.adobeio-static.net/api/v1/web/colesdemoapi/urlprovider';
  }
  console.log('Start poll...');
  setTimeout(() => {
    pollAPI(main, fn, url, interval, {});
  }, 0);
};

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);

  const playlistURI = localStorage.getItem('finalPlaylistURI');
  poll(main, addLoopingContent, playlistURI);

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
