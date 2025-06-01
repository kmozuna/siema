/**
 * Hi :-) This is a class representing a Siema.
 */
export default class Siema {
  /**
   * Create a Siema.
   * @param {Object} options - Optional settings object.
   */
  constructor(options) {
    // Merge defaults with user's settings
    this.config = Siema.mergeSettings(options);

    // Resolve selector's type
    this.sliderFrame = typeof this.config.sliderFrame === 'string' ? document.querySelector(this.config.sliderFrame) : this.config.sliderFrame;
    this.parent = typeof this.config.parent === 'string' ? document.querySelector(this.config.parent) : this.config.parent;
    // Early throw if selector doesn't exists
    if (this.sliderFrame === null) {
      throw new Error('Something wrong with your selector 😭');
    }

    // update perPage number dependable of user value
    this.resolveSlidesNumber();
    this.hasTemplate = this.config.template ? 1 : 0;
    // Create global references
    this.parentWidth = this.parent.offsetWidth;
    this.innerElements = [].slice.call(this.sliderFrame.children);
    this.currentSlide = this.config.loop ?
      this.config.startIndex % (this.innerElements.length - this.hasTemplate) :
      Math.max(0, Math.min(this.config.startIndex, (this.innerElements.length - this.hasTemplate) - this.perPage));
    this.transformProperty = Siema.webkitOrNot();

    // Bind all event handlers for referencability
    ['resizeHandler', 'touchstartHandler', 'touchendHandler', 'touchmoveHandler', 'mousedownHandler', 'mouseupHandler', 'mouseleaveHandler', 'mousemoveHandler', 'clickHandler'].forEach(method => {
      this[method] = this[method].bind(this);
    });

    // Build markup and apply required styling to elements
    this.init();
  }


  /**
   * Overrides default settings with custom ones.
   * @param {Object} options - Optional settings object.
   * @returns {Object} - Custom Siema settings.
   */
  static mergeSettings(options) {
    const settings = {
      parent: '.siema-wrapper',
      sliderFrame: '.siema',
      duration: 200,
      easing: 'ease-out',
      perPage: 1,
      startIndex: 0,
      draggable: true,
      multipleDrag: true,
      threshold: 20,
      loop: false,
      rtl: false,
      template: false,
      onInit: () => {},
      onChange: () => {},
    };

    const userSttings = options;
    for (const attrname in userSttings) {
      settings[attrname] = userSttings[attrname];
    }

    return settings;
  }


  /**
   * Determine if browser supports unprefixed transform property.
   * Google Chrome since version 26 supports prefix-less transform
   * @returns {string} - Transform property supported by client.
   */
  static webkitOrNot() {
    const style = document.documentElement.style;
    if (typeof style.transform === 'string') {
      return 'transform';
    }
    return 'WebkitTransform';
  }

  /**
   * Attaches listeners to required events.
   */
  attachEvents() {
    // Resize element on window resize
    window.addEventListener('resize', this.resizeHandler);

    // If element is draggable / swipable, add event handlers
    if (this.config.draggable) {
      // Keep track pointer hold and dragging distance
      this.pointerDown = false;
      this.drag = {
        startX: 0,
        endX: 0,
        startY: 0,
        letItGo: null,
        preventClick: false,
      };

      const eventOptions = { passive: true };

      // Touch events
      this.parent.addEventListener('touchstart', this.touchstartHandler, eventOptions);
      this.parent.addEventListener('touchend', this.touchendHandler, eventOptions);
      this.parent.addEventListener('touchmove', this.touchmoveHandler, eventOptions);

      // Mouse events
      this.parent.addEventListener('mousedown', this.mousedownHandler, eventOptions);
      this.parent.addEventListener('mouseup', this.mouseupHandler, eventOptions);
      this.parent.addEventListener('mouseleave', this.mouseleaveHandler, eventOptions);
      this.parent.addEventListener('mousemove', this.mousemoveHandler, eventOptions);

      // Click
      this.parent.addEventListener('click', this.clickHandler);
    }
  }


  /**
   * Detaches listeners from required events.
   */
  detachEvents() {
    window.removeEventListener('resize', this.resizeHandler);
    this.parent.removeEventListener('touchstart', this.touchstartHandler);
    this.parent.removeEventListener('touchend', this.touchendHandler);
    this.parent.removeEventListener('touchmove', this.touchmoveHandler);
    this.parent.removeEventListener('mousedown', this.mousedownHandler);
    this.parent.removeEventListener('mouseup', this.mouseupHandler);
    this.parent.removeEventListener('mouseleave', this.mouseleaveHandler);
    this.parent.removeEventListener('mousemove', this.mousemoveHandler);
    this.parent.removeEventListener('click', this.clickHandler);
  }


  /**
   * Builds the markup and attaches listeners to required events.
   */
  init() {
    this.attachEvents();

    // hide everything out of selector's boundaries
    this.parent.style.overflow = 'hidden';

    // rtl or ltr
    this.parent.style.direction = this.config.rtl ? 'rtl' : 'ltr';

    // build a frame and slide to a currentSlide
    this.buildSliderFrame();

    this.config.onInit.call(this);
  }


  /**
   * Build a sliderFrame and slide to a current item.
   */
  buildSliderFrame() {
    const widthItem = this.parentWidth / this.perPage;
    const itemsToBuild = this.config.loop ? (this.innerElements.length - this.hasTemplate) + (2 * this.perPage) : (this.innerElements.length - this.hasTemplate);

    // Create frame and apply styling
    this.sliderFrame.style.width = `${widthItem * itemsToBuild}px`;
    this.enableTransition();

    if (this.config.draggable) {
      this.parent.style.cursor = '-webkit-grab';
    }

    for (let i = 0; i < this.innerElements.length; i++) {
      const elm = this.innerElements[i];
      elm.style.cssFloat = this.config.rtl ? 'right' : 'left';
      elm.style.float = this.config.rtl ? 'right' : 'left';
      elm.style.width = `${this.config.loop ? 100 / ((this.innerElements.length - this.hasTemplate) + (this.perPage * 2)) : 100 / ((this.innerElements.length - this.hasTemplate))}%`;
    }
    // Go to currently active slide after initial build
    this.slideToCurrent();
  }


  buildSliderFrameItem(elm) {
    const elementContainer = document.createElement('div');
    elementContainer.style.cssFloat = this.config.rtl ? 'right' : 'left';
    elementContainer.style.float = this.config.rtl ? 'right' : 'left';
    elementContainer.style.width = `${this.config.loop ? 100 / (this.innerElements.length + (this.perPage * 2)) : 100 / (this.innerElements.length)}%`;
    elementContainer.appendChild(elm);
    return elementContainer;
  }


  /**
   * Determinates slides number accordingly to clients viewport.
   */
  resolveSlidesNumber() {
    if (typeof this.config.perPage === 'number') {
      this.perPage = this.config.perPage;
    }
    else if (typeof this.config.perPage === 'object') {
      this.perPage = 1;
      for (const viewport in this.config.perPage) {
        if (window.innerWidth >= viewport) {
          this.perPage = this.config.perPage[viewport];
        }
      }
    }
  }


  /**
   * Go to previous slide.
   * @param {number} [howManySlides=1] - How many items to slide backward.
   * @param {function} callback - Optional callback function.
   */
  prev(howManySlides = 1, callback) {
    // early return when there is nothing to slide
    if ((this.innerElements.length - this.hasTemplate) <= this.perPage) {
      return;
    }

    const beforeChange = this.currentSlide;

    if (this.config.loop) {
      const isNewIndexClone = this.currentSlide - howManySlides < 0;
      if (isNewIndexClone) {
        this.disableTransition();

        const mirrorSlideIndex = this.currentSlide + (this.innerElements.length - this.hasTemplate);
        const mirrorSlideIndexOffset = this.perPage;
        const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset;
        const offset = (this.config.rtl ? 1 : -1) * moveTo * (this.parentWidth / this.perPage);
        const dragDistance = this.config.draggable ? this.drag.endX - this.drag.startX : 0;

        this.sliderFrame.style[this.transformProperty] = `translate3d(${offset + dragDistance}px, 0, 0)`;
        this.currentSlide = mirrorSlideIndex - howManySlides;
      }
      else {
        this.currentSlide = this.currentSlide - howManySlides;
      }
    }
    else {
      this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
    }

    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent(this.config.loop);
      this.config.onChange.call(this);
      if (callback) {
        callback.call(this);
      }
    }
  }


  /**
   * Go to next slide.
   * @param {number} [howManySlides=1] - How many items to slide forward.
   * @param {function} callback - Optional callback function.
   */
  next(howManySlides = 1, callback) {
    // early return when there is nothing to slide
    if ((this.innerElements.length - this.hasTemplate) <= this.perPage) {
      return;
    }

    const beforeChange = this.currentSlide;

    if (this.config.loop) {
      const isNewIndexClone = this.currentSlide + howManySlides > (this.innerElements.length - this.hasTemplate) - this.perPage;
      if (isNewIndexClone) {
        this.disableTransition();

        const mirrorSlideIndex = this.currentSlide - (this.innerElements.length - this.hasTemplate);
        const mirrorSlideIndexOffset = this.perPage;
        const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset;
        const offset = (this.config.rtl ? 1 : -1) * moveTo * (this.parentWidth / this.perPage);
        const dragDistance = this.config.draggable ? this.drag.endX - this.drag.startX : 0;

        this.sliderFrame.style[this.transformProperty] = `translate3d(${offset + dragDistance}px, 0, 0)`;
        this.currentSlide = mirrorSlideIndex + howManySlides;
      }
      else {
        this.currentSlide = this.currentSlide + howManySlides;
      }
    }
    else {
      this.currentSlide = Math.min(this.currentSlide + howManySlides, (this.innerElements.length - this.hasTemplate) - this.perPage);
    }
    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent(this.config.loop);
      this.config.onChange.call(this);
      if (callback) {
        callback.call(this);
      }
    }
  }


  /**
   * Disable transition on sliderFrame.
   */
  disableTransition() {
    this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
    this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;
  }


  /**
   * Enable transition on sliderFrame.
   */
  enableTransition() {
    this.sliderFrame.style.webkitTransition = `all ${this.config.duration}ms ${this.config.easing}`;
    this.sliderFrame.style.transition = `all ${this.config.duration}ms ${this.config.easing}`;
  }


  /**
   * Go to slide with particular index
   * @param {number} index - Item index to slide to.
   * @param {function} callback - Optional callback function.
   */
  goTo(index, callback) {
    if ((this.innerElements.length - this.hasTemplate) <= this.perPage) {
      return;
    }
    const beforeChange = this.currentSlide;
    this.currentSlide = this.config.loop ?
      index % (this.innerElements.length - this.hasTemplate) :
      Math.min(Math.max(index, 0), (this.innerElements.length - this.hasTemplate) - this.perPage);
    if (beforeChange !== this.currentSlide) {
      this.slideToCurrent();
      this.config.onChange.call(this);
      if (callback) {
        callback.call(this);
      }
    }
  }


  /**
   * Moves sliders frame to position of currently active slide
   */
  slideToCurrent(enableTransition) {
    const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
    const offset = (this.config.rtl ? 1 : -1) * currentSlide * (this.parentWidth / this.perPage);

    if (enableTransition) {
      // This one is tricky, I know but this is a perfect explanation:
      // https://youtu.be/cCOL7MC4Pl0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.enableTransition();
          this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
        });
      });
    }
    else {
      this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
    }
  }


  /**
   * Recalculate drag /swipe event and reposition the frame of a slider
   */
  updateAfterDrag() {
    const movement = (this.config.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
    const movementDistance = Math.abs(movement);
    const howManySliderToSlide = this.config.multipleDrag ? Math.ceil(movementDistance / (this.parentWidth / this.perPage)) : 1;

    const slideToNegativeClone = movement > 0 && this.currentSlide - howManySliderToSlide < 0;
    const slideToPositiveClone = movement < 0 && this.currentSlide + howManySliderToSlide > (this.innerElements.length - this.hasTemplate) - this.perPage;

    if (movement > 0 && movementDistance > this.config.threshold && (this.innerElements.length - this.hasTemplate) > this.perPage) {
      this.prev(howManySliderToSlide);
    }
    else if (movement < 0 && movementDistance > this.config.threshold && (this.innerElements.length - this.hasTemplate) > this.perPage) {
      this.next(howManySliderToSlide);
    }
    this.slideToCurrent(slideToNegativeClone || slideToPositiveClone);
  }


  /**
   * When window resizes, resize slider components as well
   */
  resizeHandler() {
    // update perPage number dependable of user value
    this.resolveSlidesNumber();

    // relcalculate currentSlide
    // prevent hiding items when browser width increases
    if (this.currentSlide + this.perPage > (this.innerElements.length - this.hasTemplate)) {
      this.currentSlide = (this.innerElements.length - this.hasTemplate) <= this.perPage ? 0 : (this.innerElements.length - this.hasTemplate) - this.perPage;
    }

    this.parentWidth = this.parent.offsetWidth;

    this.buildSliderFrame();
  }


  /**
   * Clear drag after touchend and mouseup event
   */
  clearDrag() {
    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      letItGo: null,
      preventClick: this.drag.preventClick
    };
  }


  /**
   * touchstart event handler
   */
  touchstartHandler(e) {
    // Prevent dragging / swiping on inputs, selects and textareas
    const ignoreSiema = ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !== -1;
    if (ignoreSiema) {
      return;
    }

    e.stopPropagation();
    this.pointerDown = true;
    this.drag.startX = e.touches[0].pageX;
    this.drag.startY = e.touches[0].pageY;
  }


  /**
   * touchend event handler
   */
  touchendHandler(e) {
    e.stopPropagation();
    this.pointerDown = false;
    this.enableTransition();
    if (this.drag.endX) {
      this.updateAfterDrag();
    }
    this.clearDrag();
  }


  /**
   * touchmove event handler
   */
  touchmoveHandler(e) {
    e.stopPropagation();

    if (this.drag.letItGo === null) {
      this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
    }

    if (this.pointerDown && this.drag.letItGo) {
      e.preventDefault();
      this.drag.endX = e.touches[0].pageX;
      this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
      this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;

      const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
      const currentOffset = currentSlide * (this.parentWidth / this.perPage);
      const dragOffset = (this.drag.endX - this.drag.startX);
      const offset = this.config.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
      this.sliderFrame.style[this.transformProperty] = `translate3d(${(this.config.rtl ? 1 : -1) * offset}px, 0, 0)`;
    }
  }


  /**
   * mousedown event handler
   */
  mousedownHandler(e) {
    // Prevent dragging / swiping on inputs, selects and textareas
    const ignoreSiema = ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !== -1;
    if (ignoreSiema) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.pointerDown = true;
    this.drag.startX = e.pageX;
  }


  /**
   * mouseup event handler
   */
  mouseupHandler(e) {
    e.stopPropagation();
    this.pointerDown = false;
    this.parent.style.cursor = '-webkit-grab';
    this.enableTransition();
    if (this.drag.endX) {
      this.updateAfterDrag();
    }
    this.clearDrag();
  }


  /**
   * mousemove event handler
   */
  mousemoveHandler(e) {
    e.preventDefault();
    if (this.pointerDown) {
      // if dragged element is a link
      // mark preventClick prop as a true
      // to detemine about browser redirection later on
      if (e.target.nodeName === 'A') {
        this.drag.preventClick = true;
      }

      this.drag.endX = e.pageX;
      this.parent.style.cursor = '-webkit-grabbing';
      this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
      this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;

      const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
      const currentOffset = currentSlide * (this.parentWidth / this.perPage);
      const dragOffset = (this.drag.endX - this.drag.startX);
      const offset = this.config.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
      this.sliderFrame.style[this.transformProperty] = `translate3d(${(this.config.rtl ? 1 : -1) * offset}px, 0, 0)`;
    }
  }


  /**
   * mouseleave event handler
   */
  mouseleaveHandler(e) {
    if (this.pointerDown) {
      this.pointerDown = false;
      this.parent.style.cursor = '-webkit-grab';
      this.drag.endX = e.pageX;
      this.drag.preventClick = false;
      this.enableTransition();
      this.updateAfterDrag();
      this.clearDrag();
    }
  }


  /**
   * click event handler
   */
  clickHandler(e) {
    // if the dragged element is a link
    // prevent browsers from folowing the link
    if (this.drag.preventClick) {
      e.preventDefault();
    }
    this.drag.preventClick = false;
  }


  /**
   * Remove item from carousel.
   * @param {number} index - Item index to remove.
   * @param {function} callback - Optional callback to call after remove.
   */
  remove(index, callback) {
    if (index < 0 || index >= (this.innerElements.length - this.hasTemplate)) {
      throw new Error('Item to remove doesn\'t exist 😭');
    }

    // Shift sliderFrame back by one item when:
    // 1. Item with lower index than currenSlide is removed.
    // 2. Last item is removed.
    const lowerIndex = index < this.currentSlide;
    const lastItem = this.currentSlide + this.perPage - 1 === index;

    if (lowerIndex || lastItem) {
      this.currentSlide--;
    }

    this.innerElements.splice(index, 1);

    // build a frame and slide to a currentSlide
    this.buildSliderFrame();

    if (callback) {
      callback.call(this);
    }
  }


  /**
   * Insert item to carousel at particular index.
   * @param {HTMLElement} item - Item to insert.
   * @param {number} index - Index of new new item insertion.
   * @param {function} callback - Optional callback to call after insert.
   */
  insert(item, index, callback) {
    if (index < 0 || index > (this.innerElements.length - this.hasTemplate) + 1) {
      throw new Error('Unable to inset it at this index 😭');
    }
    if (this.innerElements.indexOf(item) !== -1) {
      throw new Error('The same item in a carousel? Really? Nope 😭');
    }

    // Avoid shifting content
    const shouldItShift = index <= this.currentSlide > 0 && (this.innerElements.length - this.hasTemplate);
    this.currentSlide = shouldItShift ? this.currentSlide + 1 : this.currentSlide;

    this.innerElements.splice(index, 0, item);

    // build a frame and slide to a currentSlide
    this.buildSliderFrame();

    if (callback) {
      callback.call(this);
    }
  }


  /**
   * Prepernd item to carousel.
   * @param {HTMLElement} item - Item to prepend.
   * @param {function} callback - Optional callback to call after prepend.
   */
  prepend(item, callback) {
    this.insert(item, 0);
    if (callback) {
      callback.call(this);
    }
  }


  /**
   * Append item to carousel.
   * @param {HTMLElement} item - Item to append.
   * @param {function} callback - Optional callback to call after append.
   */
  append(item, callback) {
    this.insert(item, (this.innerElements.length - this.hasTemplate) + 1);
    if (callback) {
      callback.call(this);
    }
  }


  /**
   * Removes listeners and optionally restores to initial markup
   * @param {boolean} restoreMarkup - Determinants about restoring an initial markup.
   * @param {function} callback - Optional callback function.
   */
  destroy(restoreMarkup = false, callback) {
    this.detachEvents();

    this.parent.style.cursor = 'auto';

    if (restoreMarkup) {
      for (let i = 0; i < (this.innerElements.length); i++) {
        this.innerElements[i].removeAttribute('style');
      }
      this.sliderFrame.removeAttribute('style');
      this.parent.removeAttribute('style');
    }

    if (callback) {
      callback.call(this);
    }
  }
}
