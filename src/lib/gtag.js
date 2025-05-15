export const pageview = (url) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('config', 'G-73ZTXVB63Y', {
      page_path: url,
    });
  } else {
    console.warn('Google Analytics not loaded yet');
  }
};

export const event = ({ action, category, label, value }) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  } else {
    console.warn('Google Analytics not loaded yet');
  }
};
