// lib/gtag.js
export const GA_MEASUREMENT_ID = 'G-73ZTXVB63Y';

export const pageview = (url) => {
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

export const event = ({ action, params }) => {
  window.gtag('event', action, params);
};
