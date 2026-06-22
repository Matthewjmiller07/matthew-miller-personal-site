<?php
/**
 * Plugin Name:       Zmanim Board
 * Plugin URI:        https://theothermatthewmiller.com/zmanim-widget
 * Description:       Displays Sof Zman Krias Shma and weekly zmanim in a framed board design. Use the [zmanim_board] shortcode or the Zmanim Board block. Live data from hebcal.com.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * Author:            Matthew Miller
 * Author URI:        https://theothermatthewmiller.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       zmanim-board
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ZMANIM_BOARD_VERSION', '1.0.0' );
define( 'ZMANIM_BOARD_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Cities supported by the widget JS. Keep in sync with assets/zmanim-board.js.
 */
function zmanim_board_cities() {
	return array(
		'Jerusalem',
		"Ra'anana / Tel Aviv",
		'Bnei Brak',
		'Haifa',
		'Beer Sheva',
		'New York',
		'Los Angeles',
		'Chicago',
		'London',
		'Toronto',
		'Montreal',
		'Paris',
		'Melbourne',
	);
}

/**
 * Register the front-end script and pass it the plugin's asset URL.
 */
function zmanim_board_register_assets() {
	wp_register_script(
		'zmanim-board',
		ZMANIM_BOARD_PLUGIN_URL . 'assets/zmanim-board.js',
		array(),
		ZMANIM_BOARD_VERSION,
		true
	);
	wp_add_inline_script(
		'zmanim-board',
		'window.ZMANIM_BOARD_CONFIG = ' . wp_json_encode( array(
			'bgUrl' => ZMANIM_BOARD_PLUGIN_URL . 'assets/zmanim-board-bg.png',
		) ) . ';',
		'before'
	);
}
add_action( 'init', 'zmanim_board_register_assets' );

/**
 * Render a widget container. Shared by the shortcode and the block.
 *
 * @param array $atts { city: string, max_width: int }
 */
function zmanim_board_render( $atts ) {
	$atts = shortcode_atts(
		array(
			'city'      => 'New York',
			'max_width' => 420,
		),
		$atts,
		'zmanim_board'
	);

	wp_enqueue_script( 'zmanim-board' );

	return sprintf(
		'<div class="zmanim-board" data-city="%s" data-max-width="%d"></div>',
		esc_attr( $atts['city'] ),
		absint( $atts['max_width'] )
	);
}
add_shortcode( 'zmanim_board', 'zmanim_board_render' );

/**
 * Gutenberg block (no build step — editor script uses wp.* globals).
 */
function zmanim_board_register_block() {
	if ( ! function_exists( 'register_block_type' ) ) {
		return;
	}

	wp_register_script(
		'zmanim-board-block',
		ZMANIM_BOARD_PLUGIN_URL . 'assets/block.js',
		array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render' ),
		ZMANIM_BOARD_VERSION,
		true
	);
	wp_add_inline_script(
		'zmanim-board-block',
		'window.ZMANIM_BOARD_CITIES = ' . wp_json_encode( zmanim_board_cities() ) . ';',
		'before'
	);

	register_block_type( 'zmanim-board/board', array(
		'editor_script'   => 'zmanim-board-block',
		'render_callback' => 'zmanim_board_render',
		'attributes'      => array(
			'city'      => array(
				'type'    => 'string',
				'default' => 'New York',
			),
			'max_width' => array(
				'type'    => 'number',
				'default' => 420,
			),
		),
	) );
}
add_action( 'init', 'zmanim_board_register_block' );

/**
 * Let the widget work in classic text widgets too.
 */
add_filter( 'widget_text', 'do_shortcode' );
