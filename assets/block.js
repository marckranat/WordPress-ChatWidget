(function(blocks, element, editor, components) {
    'use strict';
    
    var el = element.createElement;
    var registerBlockType = blocks.registerBlockType;
    var InspectorControls = editor.InspectorControls;
    var PanelColor = components.PanelColor;
    var ColorPicker = components.ColorPicker;
    var ServerSideRender = editor.ServerSideRender;
    
    registerBlockType('anonchat/widget', {
        title: 'AnonChat Widget',
        icon: 'comments',
        category: 'widgets',
        attributes: {
            buttonColor: {
                type: 'string',
                default: '#0073aa'
            }
        },
        edit: function(props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            
            return el('div', { className: 'anonchat-block-editor' },
                el(InspectorControls, {},
                    el('div', { className: 'components-panel__body' },
                        el('label', { style: { display: 'block', marginBottom: '8px' } }, 'Button Color'),
                        el('input', {
                            type: 'color',
                            value: attributes.buttonColor || '#0073aa',
                            onChange: function(event) {
                                setAttributes({ buttonColor: event.target.value });
                            },
                            style: { width: '100%', height: '40px' }
                        })
                    )
                ),
                el('div', { className: 'anonchat-block-preview', style: { padding: '20px', border: '1px dashed #ccc', borderRadius: '4px' } },
                    el('p', { style: { margin: '0 0 10px 0', fontWeight: 'bold' } }, 'AnonChat Widget'),
                    el('p', { style: { fontSize: '12px', color: '#666', margin: 0 } },
                        'Start Chat and Join Chat buttons will appear on the frontend.'
                    )
                )
            );
        },
        save: function() {
            return null; // Rendered server-side via render_callback
        }
    });
    
})(
    window.wp.blocks,
    window.wp.element,
    window.wp.editor || window.wp.blockEditor,
    window.wp.components
);

