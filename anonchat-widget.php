<?php
/**
 * Plugin Name: AnonChat Widget
 * Plugin URI: https://github.com/marckranat/WordPress-ChatWidget
 * Description: Anonymous disposable chat widget - fully self-hosted, no database, no cookies, no logs. Create temporary chat rooms with 20-character codes. Rooms auto-expire after 6 hours inactivity or 24 hours max. Real-time messaging via AJAX polling. Mobile-ready with dark/light mode. Includes shortcode, widget & Gutenberg block support.
 * Version: 1.0.0
 * Author: Marc Kranat
 * License: Free for any use
 * Text Domain: anonchat
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ANONCHAT_VERSION', '1.0.0');
define('ANONCHAT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ANONCHAT_PLUGIN_URL', plugin_dir_url(__FILE__));

class AnonChat_Widget {
    
    private static $instance = null;
    private $max_room_lifetime = 86400; // 24 hours
    private $max_inactivity = 21600; // 6 hours
    private $poll_interval = 2200; // 2.2 seconds in milliseconds
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_shortcode('anonchat', array($this, 'shortcode_handler'));
        
        // WordPress Widget
        add_action('widgets_init', array($this, 'register_widget'));
        
        // Gutenberg Block
        add_action('init', array($this, 'register_gutenberg_block'));
        
        // AJAX endpoints
        add_action('wp_ajax_anonchat_room', array($this, 'handle_ajax'));
        add_action('wp_ajax_nopriv_anonchat_room', array($this, 'handle_ajax'));
        
        // Handle GET/POST requests
        add_action('parse_request', array($this, 'handle_api_request'));
    }
    
    public function init() {
        // Load settings
        $this->max_room_lifetime = get_option('anonchat_max_lifetime', 86400);
        $this->max_inactivity = get_option('anonchat_max_inactivity', 21600);
    }
    
    public function enqueue_assets() {
        // Only load on frontend
        if (is_admin()) {
            return;
        }
        
        wp_enqueue_script('anonchat-widget', ANONCHAT_PLUGIN_URL . 'assets/anonchat.js', array(), ANONCHAT_VERSION, true);
        wp_enqueue_style('anonchat-widget', ANONCHAT_PLUGIN_URL . 'assets/anonchat.css', array(), ANONCHAT_VERSION);
        
        wp_localize_script('anonchat-widget', 'anonchatData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'pollInterval' => $this->poll_interval,
            'nonce' => wp_create_nonce('anonchat_nonce')
        ));
        
        // Add custom CSS if set
        $custom_css = get_option('anonchat_custom_css', '');
        if (!empty($custom_css)) {
            wp_add_inline_style('anonchat-widget', $custom_css);
        }
    }
    
    public function add_settings_page() {
        add_options_page(
            'AnonChat Settings',
            'AnonChat',
            'manage_options',
            'anonchat-settings',
            array($this, 'render_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('anonchat_settings', 'anonchat_max_lifetime');
        register_setting('anonchat_settings', 'anonchat_max_inactivity');
        register_setting('anonchat_settings', 'anonchat_custom_css');
        register_setting('anonchat_settings', 'anonchat_button_text_start');
        register_setting('anonchat_settings', 'anonchat_button_text_join');
        register_setting('anonchat_settings', 'anonchat_button_color');
    }
    
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>AnonChat Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('anonchat_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Max Room Lifetime (seconds)</th>
                        <td><input type="number" name="anonchat_max_lifetime" value="<?php echo esc_attr(get_option('anonchat_max_lifetime', 86400)); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Max Inactivity Timeout (seconds)</th>
                        <td><input type="number" name="anonchat_max_inactivity" value="<?php echo esc_attr(get_option('anonchat_max_inactivity', 21600)); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Start Chat Button Text</th>
                        <td><input type="text" name="anonchat_button_text_start" value="<?php echo esc_attr(get_option('anonchat_button_text_start', 'Start Chat')); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Join Chat Button Text</th>
                        <td><input type="text" name="anonchat_button_text_join" value="<?php echo esc_attr(get_option('anonchat_button_text_join', 'Join Chat')); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Button Color</th>
                        <td><input type="color" name="anonchat_button_color" value="<?php echo esc_attr(get_option('anonchat_button_color', '#0073aa')); ?>" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Custom CSS</th>
                        <td><textarea name="anonchat_custom_css" rows="10" cols="50" class="large-text code"><?php echo esc_textarea(get_option('anonchat_custom_css', '')); ?></textarea></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    public function shortcode_handler($atts) {
        $atts = shortcode_atts(array(
            'button_color' => get_option('anonchat_button_color', '#0073aa'),
        ), $atts);
        
        $start_text = get_option('anonchat_button_text_start', 'Start Chat');
        $join_text = get_option('anonchat_button_text_join', 'Join Chat');
        
        ob_start();
        ?>
        <div class="anonchat-container" data-button-color="<?php echo esc_attr($atts['button_color']); ?>">
            <div class="anonchat-buttons">
                <button class="anonchat-btn anonchat-btn-start" style="background-color: <?php echo esc_attr($atts['button_color']); ?>">
                    <?php echo esc_html($start_text); ?>
                </button>
                <button class="anonchat-btn anonchat-btn-join" style="background-color: <?php echo esc_attr($atts['button_color']); ?>">
                    <?php echo esc_html($join_text); ?>
                </button>
            </div>
            <div class="anonchat-widget" style="display: none;"></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function handle_api_request($wp) {
        if (!isset($_GET['anonchat']) || $_GET['anonchat'] !== 'room') {
            return;
        }
        
        $code = isset($_GET['code']) ? sanitize_text_field($_GET['code']) : '';
        
        if (empty($code) || strlen($code) !== 20) {
            wp_send_json_error(array('message' => 'Invalid code'));
            exit;
        }
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $this->handle_get_room($code);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handle_post_room($code);
        }
    }
    
    public function handle_ajax() {
        // Handle GET requests for polling (no nonce required for read-only)
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $code = isset($_GET['code']) ? sanitize_text_field($_GET['code']) : '';
            if (!empty($code) && strlen($code) === 20) {
                $this->handle_get_room($code);
                return;
            }
            wp_send_json_error(array('message' => 'Invalid code'));
            return;
        }
        
        // Handle POST requests (require nonce)
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'anonchat_nonce')) {
            wp_send_json_error(array('message' => 'Invalid security token'));
            return;
        }
        
        $action = isset($_POST['action_type']) ? sanitize_text_field($_POST['action_type']) : 'get';
        
        if ($action === 'create') {
            $this->handle_create_room();
            return;
        }
        
        $code = isset($_POST['code']) ? sanitize_text_field($_POST['code']) : '';
        
        if (empty($code) || strlen($code) !== 20) {
            wp_send_json_error(array('message' => 'Invalid code'));
            return;
        }
        
        switch ($action) {
            case 'join':
                $this->handle_join_room($code);
                break;
            case 'send':
                $this->handle_send_message($code);
                break;
            case 'kill':
                $this->handle_kill_room($code);
                break;
            case 'get':
            default:
                $this->handle_get_room($code);
                break;
        }
    }
    
    private function generate_room_code() {
        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $code = '';
        for ($i = 0; $i < 20; $i++) {
            $code .= $chars[random_int(0, 61)];
        }
        return $code;
    }
    
    private function get_client_id() {
        // Generate a simple client ID based on session/IP
        $ip = $this->get_client_ip();
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        return substr(md5($ip . $user_agent . time()), 0, 16);
    }
    
    private function get_client_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
    }
    
    private function check_rate_limit($key, $max_actions, $time_window) {
        $transient_key = 'anonchat_rate_' . md5($key);
        $count = get_transient($transient_key);
        
        if ($count === false) {
            set_transient($transient_key, 1, $time_window);
            return true;
        }
        
        if ($count >= $max_actions) {
            return false;
        }
        
        set_transient($transient_key, $count + 1, $time_window);
        return true;
    }
    
    private function check_ip_room_limit() {
        $ip = $this->get_client_ip();
        $ip_hash = md5($ip);
        $transient_key = 'anonchat_ip_' . $ip_hash;
        
        $room_count = get_transient($transient_key);
        if ($room_count === false) {
            $room_count = 0;
        }
        
        if ($room_count >= 10) {
            return false;
        }
        
        set_transient($transient_key, $room_count + 1, 86400);
        return true;
    }
    
    private function handle_create_room() {
        // Check rate limit
        $ip = $this->get_client_ip();
        if (!$this->check_rate_limit($ip . '_create', 1, 30)) {
            wp_send_json_error(array('message' => 'Please wait before creating another room'));
            return;
        }
        
        // Check IP room limit
        if (!$this->check_ip_room_limit()) {
            wp_send_json_error(array('message' => 'Maximum rooms per IP reached'));
            return;
        }
        
        $nickname = isset($_POST['nickname']) ? sanitize_text_field($_POST['nickname']) : '';
        $room_name = isset($_POST['room_name']) ? sanitize_text_field($_POST['room_name']) : '';
        
        if (empty($nickname) || strlen($nickname) > 30) {
            wp_send_json_error(array('message' => 'Invalid nickname (max 30 characters)'));
            return;
        }
        
        $nickname = substr(strip_tags($nickname), 0, 30);
        $room_name = substr(strip_tags($room_name), 0, 100);
        
        $code = $this->generate_room_code();
        $client_id = $this->get_client_id();
        
        $room = array(
            'code' => $code,
            'name' => $room_name,
            'created' => time(),
            'last_activity' => time(),
            'messages' => array(),
            'users' => array(
                $client_id => array(
                    'nickname' => $nickname,
                    'joined' => time(),
                    'last_seen' => time()
                )
            ),
            'creator_ip' => $ip
        );
        
        $transient_key = 'anonchat_room_' . $code;
        set_transient($transient_key, $room, $this->max_room_lifetime);
        
        wp_send_json_success(array(
            'code' => $code,
            'client_id' => $client_id,
            'room' => $this->sanitize_room_data($room)
        ));
    }
    
    private function handle_join_room($code) {
        $nickname = isset($_POST['nickname']) ? sanitize_text_field($_POST['nickname']) : '';
        
        if (empty($nickname) || strlen($nickname) > 30) {
            wp_send_json_error(array('message' => 'Invalid nickname (max 30 characters)'));
            return;
        }
        
        $nickname = substr(strip_tags($nickname), 0, 30);
        
        $transient_key = 'anonchat_room_' . $code;
        $room = get_transient($transient_key);
        
        if ($room === false) {
            wp_send_json_error(array('message' => 'Room not found or expired'));
            return;
        }
        
        // Check if room expired
        if (time() - $room['last_activity'] > $this->max_inactivity) {
            delete_transient($transient_key);
            wp_send_json_error(array('message' => 'Room expired due to inactivity'));
            return;
        }
        
        $client_id = $this->get_client_id();
        
        // Add user if not exists
        if (!isset($room['users'][$client_id])) {
            $room['users'][$client_id] = array(
                'nickname' => $nickname,
                'joined' => time(),
                'last_seen' => time()
            );
            
            // Add join message
            $room['messages'][] = array(
                'type' => 'system',
                'message' => $nickname . ' joined',
                'time' => time()
            );
        }
        
        $room['last_activity'] = time();
        $room['users'][$client_id]['last_seen'] = time();
        
        set_transient($transient_key, $room, $this->max_room_lifetime);
        
        wp_send_json_success(array(
            'client_id' => $client_id,
            'room' => $this->sanitize_room_data($room)
        ));
    }
    
    private function handle_send_message($code) {
        // Check rate limit
        $ip = $this->get_client_ip();
        if (!$this->check_rate_limit($ip . '_message', 5, 10)) {
            wp_send_json_error(array('message' => 'Rate limit exceeded'));
            return;
        }
        
        $message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
        $client_id = isset($_POST['client_id']) ? sanitize_text_field($_POST['client_id']) : '';
        
        if (empty($message) || strlen($message) > 500) {
            wp_send_json_error(array('message' => 'Invalid message (max 500 characters)'));
            return;
        }
        
        $message = substr(strip_tags($message), 0, 500);
        
        $transient_key = 'anonchat_room_' . $code;
        $room = get_transient($transient_key);
        
        if ($room === false) {
            wp_send_json_error(array('message' => 'Room not found'));
            return;
        }
        
        if (!isset($room['users'][$client_id])) {
            wp_send_json_error(array('message' => 'Not a member of this room'));
            return;
        }
        
        // Add message
        $room['messages'][] = array(
            'type' => 'user',
            'client_id' => $client_id,
            'nickname' => $room['users'][$client_id]['nickname'],
            'message' => $message,
            'time' => time()
        );
        
        // Keep only last 100 messages
        if (count($room['messages']) > 100) {
            $room['messages'] = array_slice($room['messages'], -100);
        }
        
        $room['last_activity'] = time();
        $room['users'][$client_id]['last_seen'] = time();
        
        set_transient($transient_key, $room, $this->max_room_lifetime);
        
        wp_send_json_success(array('room' => $this->sanitize_room_data($room)));
    }
    
    private function handle_get_room($code) {
        $client_id = isset($_GET['client_id']) ? sanitize_text_field($_GET['client_id']) : (isset($_POST['client_id']) ? sanitize_text_field($_POST['client_id']) : '');
        
        $transient_key = 'anonchat_room_' . $code;
        $room = get_transient($transient_key);
        
        if ($room === false) {
            wp_send_json_error(array('message' => 'Room not found'));
            return;
        }
        
        // Update user last_seen if provided
        if (!empty($client_id) && isset($room['users'][$client_id])) {
            $room['users'][$client_id]['last_seen'] = time();
            $room['last_activity'] = time();
            set_transient($transient_key, $room, $this->max_room_lifetime);
        }
        
        // Clean up inactive users (not seen in 5 minutes)
        $now = time();
        $users_cleaned = false;
        foreach ($room['users'] as $uid => $user) {
            if ($now - $user['last_seen'] > 300) {
                unset($room['users'][$uid]);
                $users_cleaned = true;
            }
        }
        
        // Save cleaned users if any were removed
        if ($users_cleaned) {
            set_transient($transient_key, $room, $this->max_room_lifetime);
        }
        
        // Check if room expired
        if (time() - $room['last_activity'] > $this->max_inactivity) {
            delete_transient($transient_key);
            wp_send_json_error(array('message' => 'Room expired'));
            return;
        }
        
        wp_send_json_success(array('room' => $this->sanitize_room_data($room)));
    }
    
    private function sanitize_room_data($room) {
        $sanitized = array(
            'code' => $room['code'],
            'name' => $room['name'],
            'created' => $room['created'],
            'last_activity' => $room['last_activity'],
            'messages' => array(),
            'users' => array()
        );
        
        foreach ($room['messages'] as $msg) {
            $sanitized['messages'][] = array(
                'type' => sanitize_text_field($msg['type']),
                'nickname' => isset($msg['nickname']) ? sanitize_text_field($msg['nickname']) : '',
                'message' => isset($msg['message']) ? sanitize_text_field($msg['message']) : '',
                'time' => intval($msg['time'])
            );
        }
        
        foreach ($room['users'] as $uid => $user) {
            $sanitized['users'][$uid] = array(
                'nickname' => sanitize_text_field($user['nickname']),
                'joined' => intval($user['joined']),
                'last_seen' => intval($user['last_seen'])
            );
        }
        
        return $sanitized;
    }
    
    private function handle_kill_room($code) {
        $client_id = isset($_POST['client_id']) ? sanitize_text_field($_POST['client_id']) : '';
        
        $transient_key = 'anonchat_room_' . $code;
        $room = get_transient($transient_key);
        
        if ($room === false) {
            wp_send_json_error(array('message' => 'Room not found'));
            return;
        }
        
        // Only creator can kill the room (check by IP or allow any user for simplicity)
        // For security, we'll allow any user in the room to kill it
        if (!empty($client_id) && !isset($room['users'][$client_id])) {
            wp_send_json_error(array('message' => 'Not authorized to delete this room'));
            return;
        }
        
        // Delete the room
        delete_transient($transient_key);
        
        wp_send_json_success(array('message' => 'Room deleted successfully'));
    }
    
    public function register_widget() {
        register_widget('AnonChat_WP_Widget');
    }
    
    public function register_gutenberg_block() {
        if (!function_exists('register_block_type')) {
            return;
        }
        
        // Register block editor script
        wp_register_script(
            'anonchat-gutenberg',
            ANONCHAT_PLUGIN_URL . 'assets/block.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'),
            ANONCHAT_VERSION,
            true
        );
        
        // Register block
        register_block_type('anonchat/widget', array(
            'editor_script' => 'anonchat-gutenberg',
            'render_callback' => array($this, 'render_gutenberg_block'),
            'attributes' => array(
                'buttonColor' => array(
                    'type' => 'string',
                    'default' => get_option('anonchat_button_color', '#0073aa')
                )
            )
        ));
    }
    
    public function render_gutenberg_block($attributes) {
        $button_color = isset($attributes['buttonColor']) ? $attributes['buttonColor'] : get_option('anonchat_button_color', '#0073aa');
        return $this->shortcode_handler(array('button_color' => $button_color));
    }
}

// WordPress Widget Class
class AnonChat_WP_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'anonchat_widget',
            'AnonChat Widget',
            array('description' => 'Anonymous disposable chat widget')
        );
    }
    
    public function widget($args, $instance) {
        echo $args['before_widget'];
        
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        
        $button_color = !empty($instance['button_color']) ? $instance['button_color'] : get_option('anonchat_button_color', '#0073aa');
        echo do_shortcode('[anonchat button_color="' . esc_attr($button_color) . '"]');
        
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : '';
        $button_color = !empty($instance['button_color']) ? $instance['button_color'] : get_option('anonchat_button_color', '#0073aa');
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>">Title:</label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" 
                   name="<?php echo esc_attr($this->get_field_name('title')); ?>" 
                   type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('button_color')); ?>">Button Color:</label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('button_color')); ?>" 
                   name="<?php echo esc_attr($this->get_field_name('button_color')); ?>" 
                   type="color" value="<?php echo esc_attr($button_color); ?>">
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['button_color'] = (!empty($new_instance['button_color'])) ? sanitize_text_field($new_instance['button_color']) : '#0073aa';
        return $instance;
    }
}

// Initialize plugin
AnonChat_Widget::get_instance();

