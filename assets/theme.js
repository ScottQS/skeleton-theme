(() => {
  const selectors = {
    productForm: '.product-section__form, .featured-product__form',
    predictiveSearch: '[data-predictive-search]',
  };

  const parseJSON = (node) => {
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  };

  const debounce = (callback, wait = 250) => {
    let timeout;
    return (...args) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => callback(...args), wait);
    };
  };

  const escapeHTML = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  class ProductFormController {
    constructor(form) {
      this.form = form;
      this.productRoot = form.closest('[data-product-root]');
      this.variantData = parseJSON(this.productRoot?.querySelector('[data-product-variants]')) || [];
      this.optionInputs = [...form.querySelectorAll('[data-option-input]')];
      this.variantInput = form.querySelector('input[name="id"]');
      this.priceNode = this.productRoot?.querySelector('[data-product-price]');
      this.compareNode = this.productRoot?.querySelector('[data-product-compare]');
      this.availabilityNode = this.productRoot?.querySelector('[data-product-availability]');
      this.addToCartButton = form.querySelector('[data-add-to-cart]');
      this.mediaItems = [...(this.productRoot?.querySelectorAll('[data-media-id]') || [])];

      this.bindEvents();
      this.onVariantChange();
    }

    bindEvents() {
      this.form.addEventListener('change', (event) => {
        if (
          event.target.matches('[data-option-input]') ||
          event.target.matches('select[name="id"]')
        ) {
          this.onVariantChange();
        }
      });
    }

    getVariantFromOptions() {
      if (!this.variantData.length) return null;

      if (this.optionInputs.length === 0) {
        const selectedId = Number(this.variantInput?.value || this.variantData[0]?.id);
        return this.variantData.find((variant) => variant.id === selectedId) || this.variantData[0];
      }

      const optionPositions = [...new Set(this.optionInputs.map((input) => input.dataset.optionPosition))];
      const selectedOptions = optionPositions.map((position) => {
        const checkedInput = this.form.querySelector(
          `[data-option-input][data-option-position="${position}"]:checked`
        );

        if (checkedInput) return checkedInput.value;

        const selectedInput = this.form.querySelector(
          `[data-option-input][data-option-position="${position}"]`
        );
        return selectedInput?.value;
      });

      return this.variantData.find((variant) =>
        variant.options.every((option, index) => option === selectedOptions[index])
      );
    }

    onVariantChange() {
      const variant = this.getVariantFromOptions();
      if (!variant) return;

      if (this.variantInput) {
        this.variantInput.value = variant.id;
      }

      if (this.priceNode) {
        this.priceNode.textContent = variant.price_formatted;
      }

      if (this.compareNode) {
        if (variant.compare_at_price_formatted && variant.compare_at_price > variant.price) {
          this.compareNode.hidden = false;
          this.compareNode.textContent = variant.compare_at_price_formatted;
        } else {
          this.compareNode.hidden = true;
          this.compareNode.textContent = '';
        }
      }

      if (this.availabilityNode) {
        this.availabilityNode.textContent = variant.available ? 'In stock' : 'Sold out';
      }

      if (this.addToCartButton) {
        this.addToCartButton.disabled = !variant.available;
        this.addToCartButton.textContent = variant.available ? 'Add to cart' : 'Sold out';
      }

      this.updateMedia(variant);
      this.updateURL(variant.id);
    }

    updateMedia(variant) {
      if (!this.mediaItems.length || !variant.featured_media_id) return;

      let activeMedia;
      this.mediaItems.forEach((mediaItem) => {
        const isActive = String(mediaItem.dataset.mediaId) === String(variant.featured_media_id);
        mediaItem.classList.toggle('is-active', isActive);
        if (isActive) activeMedia = mediaItem;
      });

      if (activeMedia && this.productRoot?.dataset.mediaBehavior === 'single') {
        this.mediaItems.forEach((mediaItem) => {
          mediaItem.hidden = mediaItem !== activeMedia;
        });
      }
    }

    updateURL(variantId) {
      if (!history.replaceState || !variantId) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variantId);
      history.replaceState({}, '', url.toString());
    }
  }

  class PredictiveSearchController {
    constructor(container) {
      this.container = container;
      this.input = container.querySelector('input[type="search"]');
      this.results = container.querySelector('[data-predictive-results]');
      this.endpoint = container.dataset.endpoint;
      this.language = document.documentElement.lang || 'en';

      if (!this.input || !this.results || !this.endpoint) return;

      this.input.addEventListener('input', debounce((event) => this.onChange(event), 220));
      this.input.addEventListener('focus', () => {
        if (this.results.innerHTML.trim() !== '') this.results.hidden = false;
      });
      document.addEventListener('click', (event) => {
        if (!this.container.contains(event.target)) this.results.hidden = true;
      });
    }

    async onChange(event) {
      const query = event.target.value.trim();

      if (query.length < 2) {
        this.results.hidden = true;
        this.results.innerHTML = '';
        return;
      }

      const requestURL =
        `${this.endpoint}.json?q=${encodeURIComponent(query)}` +
        '&resources[type]=product,article,page' +
        '&resources[limit]=6' +
        '&resources[options][fields]=title,product_type,variants.title' +
        `&resources[options][unavailable_products]=hide` +
        `&locale=${this.language}`;

      try {
        const response = await fetch(requestURL, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Predictive search request failed.');
        const data = await response.json();
        this.renderResults(data.resources?.results || {});
      } catch (error) {
        this.results.hidden = true;
      }
    }

    renderResults(results) {
      const products = results.products || [];
      const pages = results.pages || [];
      const articles = results.articles || [];
      const combined = [...products, ...pages, ...articles];

      if (combined.length === 0) {
        this.results.hidden = false;
        this.results.innerHTML = '<p class="predictive-search__empty">No suggestions found.</p>';
        return;
      }

      const items = combined
        .map((item) => {
          const title = escapeHTML(item.title || '');
          const url = escapeHTML(item.url || '#');
          return `
            <li class="predictive-search__item">
              <a href="${url}">
                <span>${title}</span>
              </a>
            </li>
          `;
        })
        .join('');

      this.results.hidden = false;
      this.results.innerHTML = `<ul class="predictive-search__list">${items}</ul>`;
    }
  }

  const initLookbookGalleries = () => {
    document.querySelectorAll('[data-lookbook-gallery]').forEach((gallery) => {
      const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
      const thumbs = [...gallery.querySelectorAll('[data-gallery-thumb]')];

      if (slides.length <= 1 || thumbs.length === 0) return;

      const showSlide = (targetIndex) => {
        slides.forEach((slide, index) => {
          slide.classList.toggle('is-active', index === targetIndex);
        });
        thumbs.forEach((thumb, index) => {
          thumb.classList.toggle('is-active', index === targetIndex);
        });
      };

      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const targetIndex = Number(thumb.dataset.slideIndex || 0);
          showSlide(targetIndex);
        });
      });
    });
  };

  const initProductRecommendations = () => {
    document.querySelectorAll('[data-product-recommendations]').forEach(async (section) => {
      const url = section.dataset.url;
      if (!url) return;

      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const renderedSection = doc.querySelector('[data-product-recommendations]');

        if (!renderedSection || renderedSection.innerHTML.trim() === '') {
          section.remove();
          return;
        }

        section.innerHTML = renderedSection.innerHTML;
      } catch (error) {
        // Keep fallback state without recommendations if request fails.
      }
    });
  };

  const initProductForms = () => {
    document.querySelectorAll(selectors.productForm).forEach((form) => new ProductFormController(form));
  };

  const initPredictiveSearch = () => {
    document
      .querySelectorAll(selectors.predictiveSearch)
      .forEach((container) => new PredictiveSearchController(container));
  };

  document.addEventListener('DOMContentLoaded', () => {
    initProductForms();
    initPredictiveSearch();
    initLookbookGalleries();
    initProductRecommendations();
  });
})();
