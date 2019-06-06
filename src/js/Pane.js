/*
 * This file is part of jQuery Pane.
 *
 * @license   https://opensource.org/licenses/MIT MIT License
 * @copyright 2018
 * @author Cassie ROUSSEAU <https://github.com/K6-front>
 * @author Ronan GIRON <https://github.com/ElGigi>
 * @author Yohann LORANT <https://github.com/ylorant>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code, to the root.
 */

import $ from 'jquery'

const PaneManager = (($) => {
  // Check jQuery requirements
  if (typeof $ === 'undefined') {
    throw new TypeError('jQuery Pane requires jQuery. jQuery must be included before.')
  }

  /**
   * Get Internet Explorer version.
   *
   * @return {number}
   */
  function GetIEVersion() {
    let sAgent = window.navigator.userAgent
    let Idx = sAgent.indexOf("MSIE")

    // If IE, return version number.
    if (Idx > 0) {
      return parseInt(sAgent.substring(Idx + 5, sAgent.indexOf(".", Idx)))
    }
    // If IE 11 then look for Updated user agent string.
    else if (!!navigator.userAgent.match(/Trident\/7\./)) {
      return 11
    } else {
      return 0 //It is not IE
    }
  }

  /**
   * Defaults
   */

  const Default = {
    debug: false,
    container: 'body',
    loader: '',
    transitionInTime: 50,
    transitionOutTime: 400,
    ajax: {},
  }

  /**
   * Events
   */

  const Event = {
    // Pane
    SHOW: 'show.pane',
    SHOWN: 'shown.pane',
    HIDE: 'hide.pane',
    HIDDEN: 'hidden.pane',
    // Pane content
    LOADING: 'loading.content.pane',
    LOADED: 'loaded.content.pane',
    LOADING_ERROR: 'error.content.pane',
    PRINTED: 'printed.content.pane',
    SUBMIT: 'submit.content.pane',
    // Selectors
    CLICK_DISMISS: 'click.dismiss.pane',
    CLICK_DATA_API: 'click.pane',
    SUBMIT_DATA_API: 'submit.pane',
  }

  /**
   * SELECTORS
   */

  const Selector = {
    WRAPPER: '.pane-wrapper:first',
    LOADER: '.pane-loader',
    PANE: '.pane',
    PANE_NOT_STATIC: '.pane:not(.pane-static)',
    FORM: 'form:not([target])',
    SUBMIT: 'form:not([target]) :submit[name]',
    DATA_TOGGLE: '[data-toggle="pane"]',
    DATA_DISMISS: '[data-dismiss="pane"]',
  }

  /**
   * PaneManager
   */
  class PaneManager {
    constructor(config) {
      this._config = this._getConfig(config)
      this._wrapper = null
      this._events()

      // Debug
      if (this.config('debug')) {
        console.debug('PaneManager initialized')
      }
    }

    // Getters

    get wrapper() {
      if (!this._wrapper) {
        this._wrapper = $(Selector.WRAPPER)

        if (this._wrapper.length === 0) {
          this._wrapper = $('<div class="pane-wrapper"></div>')
          $(this._config.container).append(this._wrapper)
        }

        // Internet explorer
        if (!this._wrapper.hasClass('pane-ie') && GetIEVersion() > 0) {
          this._wrapper.addClass('pane-ie')
        }
      }

      return this._wrapper
    }

    // Public

    refresh() {
      this._wrapper.toggleClass('is-open', $(Selector.PANE_NOT_STATIC, this._wrapper).length > 0)
    }

    config(key) {
      if (!typeof this._config[key]) {
        throw new TypeError('Undefined option name "' + key + '"')
      }

      return this._config[key]
    }

    new(paneClass) {
      let pane = new Pane(this)
      pane.open(paneClass || '')

      return pane
    }

    newStatic(element, href) {
      return new Pane(this, element, href)
    }

    // Private

    _events() {
      let manager = this

      $(document)
        .off(Event.CLICK_DATA_API, Selector.DATA_TOGGLE)
        .on(Event.CLICK_DATA_API,
            Selector.DATA_TOGGLE,
            function (event) {
              event.preventDefault()
              event.stopPropagation()

              // Debug
              if (manager.config('debug')) {
                console.debug('Selector', Selector.DATA_TOGGLE, 'has been clicked')
              }

              manager._pane(this)
            })
    }

    _pane(relatedTarget) {
      let pane = null,
        href = $(relatedTarget).data('href') || $(relatedTarget).attr('href'),
        target = $(relatedTarget).data('paneTarget') || ''

      if (!href) {
        console.error('Pane has no href to load content')
        return
      }

      // Target self?
      if (target === 'self') {
        pane = $(relatedTarget).parents(Selector.PANE).data('pane')
      }

      // Need to create pane?
      if (!pane) {
        pane = this.new($(relatedTarget).data('paneClass') || '')
      }
      pane.load(href, $(relatedTarget).data('paneLoadOptions'))

      return pane
    }

    _getConfig(config) {
      config = {
        ...Default,
        ...config
      }

      return config
    }
  }

  /**
   * Pane
   */
  class Pane {
    constructor(paneManager, element, href) {
      this._manager = paneManager
      this._jqXHR = null
      this._isTransitioning = false
      this._isStatic = true
      this._element = null
      this._href = href || null
      this._loadOptions = {}

      // if no element given in argument
      this._element = element
      if (!this._element) {
        this._element = $('<div role="complementary" class="pane"></div>')
        this._isStatic = false
      }
      this._element.data('pane', this)

      this._events()
    }

    // Getters

    get location() {
      return new URL(this._href, document.location.toString())
    }

    // Setters

    set location(location) {
      this._href = location.toString()
    }

    // Public

    open(className) {
      if (this._isStatic) {
        return
      }

      if (this._isTransitioning) {
        return
      }

      let pane = this

      // Size?
      if (typeof className === 'string') {
        pane._element.addClass(className)
      }

      this._isTransitioning = true
      this._manager.wrapper.prepend(this._element)
      this._manager.refresh()

      // Event trigger
      pane._element.trigger(Event.SHOW)
      if (pane._manager.config('debug')) {
        console.debug('Triggered event:', Event.SHOW)
      }

      // Animation
      setTimeout(
        function () {
          pane._element.addClass('is-visible')

          // Event trigger
          pane._element.trigger(Event.SHOWN)
          if (pane._manager.config('debug')) {
            console.debug('Triggered event:', Event.SHOWN)
          }

          pane._isTransitioning = false
        },
        50
      )
    }

    reload(fragments) {
      this.load(this._href, null, fragments)
    }

    load(href, loadOptions, fragments) {
      if (typeof href !== 'string') {
        throw new TypeError('Pane::load() method need href in first argument')
      }

      // Set to private properties
      this._href = href
      if (typeof loadOptions === 'object') {
        this._loadOptions = loadOptions
      }

      // Load content with AJAX
      this._ajax(
        {
          url: this._href,
          ...this._loadOptions,
        },
        fragments
      )
    }

    close() {
      if (this._isStatic) {
        return
      }

      if (this._isTransitioning) {
        return
      }

      let pane = this,
        manager = this._manager

      // Event trigger
      let eventClose = $.Event(Event.HIDE, {pane: pane._element})
      pane._element.trigger(eventClose)
      if (pane._manager.config('debug')) {
        console.debug('Triggered event:', Event.HIDE)
      }

      if (!eventClose.isPropagationStopped()) {
        // Animation
        this._isTransitioning = true
        pane._element.removeClass('is-visible')

        // After animation
        setTimeout(
          function () {
            pane._element.remove()
            manager.refresh()

            // Event trigger
            pane._element.trigger(Event.HIDDEN)
            if (pane._manager.config('debug')) {
              console.debug('Triggered event:', Event.HIDDEN)
            }

            pane._isTransitioning = false
          },
          400
        )
      }
    }

    // Private

    _events() {
      let pane = this

      this._element
          // Dismiss
          .off(Event.CLICK_DISMISS, Selector.DATA_DISMISS)
          .on(Event.CLICK_DISMISS,
              Selector.DATA_DISMISS,
              function (event) {
                event.preventDefault()

                pane.close()
              })
          // Submit buttons
          .off(Event.CLICK_DATA_API, Selector.SUBMIT)
          .on(Event.CLICK_DATA_API,
              Selector.SUBMIT,
              function () {
                let $form = $(this).parents('form')

                $form.data('submitButton',
                           {
                             'name': $(this).attr('name'),
                             'value': $(this).val(),
                             'novalidate': ($(this).attr('formnovalidate') !== undefined)
                           })
              })
          // Submit form
          .off(Event.SUBMIT_DATA_API, Selector.FORM)
          .on(Event.SUBMIT_DATA_API,
              Selector.FORM,
              function (event) {
                event.preventDefault()

                let $form = $(this)

                // Submit button
                let submitButton = null
                if ($.isPlainObject($form.data('submitButton'))) {
                  submitButton = $form.data('submitButton')
                }

                if ((submitButton && submitButton.novalidate) ||
                  typeof $form.get(0).checkValidity !== 'function' ||
                  $form.get(0).checkValidity()) {
                  // Get data of form
                  let formData = pane._serializeForm($form)

                  // Add button to form data
                  if (submitButton) {
                    formData.append(submitButton.name, submitButton.value)
                  }

                  // Form submission
                  pane._ajax({
                               url: $(this).attr('action') || pane._href,
                               method: $(this).attr('method') || 'get',
                               processData: false,
                               contentType: false,
                               data: formData,
                               dataType: 'json'
                             })

                  // Remove submit button reference
                  $form.removeData('submitButton')
                }
              })
    }

    _serializeForm(form) {
      var formData = new FormData(),
        formParams = form.serializeArray()

      $.each(form.find('input[type="file"]'), function (i, tag) {
        $.each($(tag)[0].files, function (i, file) {
          formData.append(tag.name, file)
        })
      })

      $.each(formParams, function (i, val) {
        formData.append(val.name, val.value)
      })

      return formData
    }

    _loader(toggle) {
      toggle = typeof toggle === 'boolean' ? toggle : true

      if (toggle) {
        let $loader = $(Selector.LOADER, this._element)

        if ($loader.length === 0) {
          $loader = $('<div class="pane-loader"></div>')
          $loader.append(this._manager.config('loader'))
          $(this._element).prepend($loader)
        }
      } else {
        $(Selector.LOADER, this._element).remove()
      }
    }

    _ajax(options, fragments) {
      if (this._jqXHR) {
        return
      }

      let pane = this

      // Event trigger
      pane._element.trigger(Event.LOADING)
      if (pane._manager.config('debug')) {
        console.debug('Triggered event:', Event.LOADING)
      }
      pane._loader(true)

      // Ajax options
      options = {
        method: 'get',
        ...this._manager.config('ajax'),
        ...options,
        success: function (data, textStatus, jqXHR) {
          pane._jqXHR = null
          pane._loader(false)

          let eventLoaded = $.Event(Event.LOADED,
                                    {
                                      pane: pane._element,
                                      paneAjax: {
                                        data: data,
                                        textStatus: textStatus,
                                        jqXHR: jqXHR,
                                        fragments: fragments || null,
                                      }
                                    })

          // Event trigger
          pane._element.trigger(eventLoaded)
          if (pane._manager.config('debug')) {
            console.debug('Triggered event:', Event.LOADED)
          }

          if (!eventLoaded.isPropagationStopped()) {
            if (fragments) {
              $(fragments, pane._element).first().html($(jqXHR.responseText).find(fragments).html())
            } else {
              pane._element.html(jqXHR.responseText)
            }

            pane._element.trigger(Event.PRINTED, pane._element)
            if (pane._manager.config('debug')) {
              console.debug('Triggered event:', Event.PRINTED)
            }
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          pane._jqXHR = null
          pane._loader(false)

          let eventLoadingError = $.Event(Event.LOADING_ERROR,
                                          {
                                            pane: pane._element,
                                            paneAjax: {
                                              textStatus: textStatus,
                                              jqXHR: jqXHR,
                                              errorThrown: errorThrown,
                                            }
                                          })

          // Event trigger
          pane._element.trigger(eventLoadingError)
          if (pane._manager.config('debug')) {
            console.debug('Triggered event:', Event.LOADING_ERROR)
          }

          if (!eventLoadingError.isPropagationStopped()) {
            pane.close()
          }
        }
      }

      // Ajax
      this._jqXHR = $.ajax(options)
    }

    static _jQueryInterface(action, arg1, arg2) {
      return this.each(function () {
        if (!(typeof $(this).data('pane') === 'object' && $(this).data('pane') instanceof Pane)) {
          throw new Error('Not a pane')
        }

        if (typeof action === 'string') {
          let pane = $(this).data('pane')

          switch (action) {
            case 'close':
            case 'load':
            case 'reload':
              pane[action](arg1, arg2)
              break
            default:
              throw new TypeError(`No method named "${action}"`)
          }
        }
      })
    }
  }

  // jQuery
  $.fn['pane'] = Pane._jQueryInterface
  $.fn['pane'].noConflict = function () {
    return Pane._jQueryInterface
  }

  return function (config) {
    return new PaneManager(config)
  }
})($)

export default PaneManager
