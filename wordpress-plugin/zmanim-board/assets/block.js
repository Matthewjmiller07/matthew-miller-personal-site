/* Zmanim Board — Gutenberg block (no build step, uses wp.* globals) */
(function (blocks, element, components, blockEditor, serverSideRender) {
  'use strict';

  var el = element.createElement;
  var InspectorControls = blockEditor.InspectorControls;
  var PanelBody = components.PanelBody;
  var SelectControl = components.SelectControl;
  var RangeControl = components.RangeControl;
  var ServerSideRender = serverSideRender;

  var cityOptions = (window.ZMANIM_BOARD_CITIES || ['New York']).map(function (c) {
    return { label: c, value: c };
  });

  blocks.registerBlockType('zmanim-board/board', {
    title: 'Zmanim Board',
    description: 'Sof Zman Krias Shma board with weekly zmanim, live from hebcal.com.',
    icon: 'clock',
    category: 'widgets',
    attributes: {
      city: { type: 'string', default: 'New York' },
      max_width: { type: 'number', default: 420 },
    },
    supports: { align: ['center'] },

    edit: function (props) {
      var atts = props.attributes;
      return el(
        element.Fragment,
        null,
        el(
          InspectorControls,
          null,
          el(
            PanelBody,
            { title: 'Widget Settings', initialOpen: true },
            el(SelectControl, {
              label: 'Default city',
              value: atts.city,
              options: cityOptions,
              onChange: function (v) { props.setAttributes({ city: v }); },
            }),
            el(RangeControl, {
              label: 'Max width (px)',
              value: atts.max_width,
              min: 200,
              max: 800,
              onChange: function (v) { props.setAttributes({ max_width: v }); },
            })
          )
        ),
        // Static preview in the editor (the live widget needs front-end JS)
        el(
          'div',
          {
            style: {
              border: '1px dashed #8b1a2b',
              borderRadius: '6px',
              padding: '24px',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              color: '#3a0a14',
              background: '#fdfaf6',
            },
          },
          el('div', { style: { fontSize: '18px', fontWeight: 700 } }, '🕰 Zmanim Board'),
          el('div', { style: { fontSize: '13px', marginTop: '6px', color: '#666' } },
            'City: ' + atts.city + ' · Max width: ' + atts.max_width + 'px'),
          el('div', { style: { fontSize: '12px', marginTop: '4px', color: '#999' } },
            'Live board renders on the published page.')
        )
      );
    },

    // Server-rendered via render_callback
    save: function () { return null; },
  });
})(
  window.wp.blocks,
  window.wp.element,
  window.wp.components,
  window.wp.blockEditor,
  window.wp.serverSideRender
);
