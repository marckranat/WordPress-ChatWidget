(function() {
    'use strict';
    
    const AnonChat = {
        pollTimer: null,
        currentCode: null,
        clientId: null,
        lastMessageTime: 0,
        widget: null,
        
        init: function() {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupContainers();
                this.setupEventListeners();
                this.checkUrlForCode();
            });
        },
        
        checkUrlForCode: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('anonchat');
            if (code && code.length === 20) {
                // Auto-show join modal if code is in URL
                const container = document.querySelector('.anonchat-container');
                if (container) {
                    setTimeout(() => {
                        this.showJoinModalWithCode(container, code);
                    }, 500);
                }
            }
        },
        
        showJoinModalWithCode: function(container, code) {
            const modal = this.createModal('Join Chat', [
                { label: 'Room Code (20 characters)', name: 'code', required: true, maxLength: 20, placeholder: 'Paste code here', defaultValue: code },
                { label: 'Nickname (max 30 chars)', name: 'nickname', required: true, maxLength: 30 }
            ], 'Join', (data) => {
                this.joinRoom(data.code, data.nickname, container);
            });
            
            document.body.appendChild(modal);
            setTimeout(() => {
                modal.classList.add('active');
                const codeInput = modal.querySelector('[name="code"]');
                if (codeInput) codeInput.value = code;
            }, 10);
        },
        
        setupContainers: function() {
            const containers = document.querySelectorAll('.anonchat-container');
            containers.forEach(container => {
                const buttonColor = container.dataset.buttonColor || '#0073aa';
                if (buttonColor) {
                    container.style.setProperty('--anonchat-accent', buttonColor);
                }
            });
        },
        
        setupEventListeners: function() {
            // Start Chat button
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('anonchat-btn-start')) {
                    e.preventDefault();
                    this.showCreateModal(e.target.closest('.anonchat-container'));
                }
            });
            
            // Join Chat button
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('anonchat-btn-join')) {
                    e.preventDefault();
                    this.showJoinModal(e.target.closest('.anonchat-container'));
                }
            });
            
            // Modal close
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('anonchat-modal') || e.target.classList.contains('anonchat-form-btn-secondary')) {
                    this.closeModal();
                }
            });
            
            // Send message
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('anonchat-send-btn')) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Enter key in input
            document.addEventListener('keypress', (e) => {
                if (e.target.classList.contains('anonchat-input') && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        },
        
        showCreateModal: function(container) {
            const modal = this.createModal('Start Chat', [
                { label: 'Nickname (max 30 chars)', name: 'nickname', required: true, maxLength: 30 },
                { label: 'Room Name (optional)', name: 'room_name', required: false, maxLength: 100 }
            ], 'Create', (data) => {
                this.createRoom(data.nickname, data.room_name, container);
            });
            
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);
        },
        
        showJoinModal: function(container) {
            const modal = this.createModal('Join Chat', [
                { label: 'Room Code (20 characters)', name: 'code', required: true, maxLength: 20, placeholder: 'Paste code here' },
                { label: 'Nickname (max 30 chars)', name: 'nickname', required: true, maxLength: 30 }
            ], 'Join', (data) => {
                this.joinRoom(data.code, data.nickname, container);
            });
            
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);
        },
        
        createModal: function(title, fields, buttonText, onSubmit) {
            const modal = document.createElement('div');
            modal.className = 'anonchat-modal';
            modal.innerHTML = `
                <div class="anonchat-modal-content">
                    <div class="anonchat-modal-title">${this.escapeHtml(title)}</div>
                    <form class="anonchat-form">
                        ${fields.map(field => `
                            <div class="anonchat-form-group">
                                <label class="anonchat-form-label">
                                    ${this.escapeHtml(field.label)}
                                    ${field.required ? '<span style="color: #d63638;">*</span>' : ''}
                                </label>
                                <input 
                                    type="text" 
                                    class="anonchat-form-input" 
                                    name="${field.name}" 
                                    ${field.required ? 'required' : ''} 
                                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                                    ${field.placeholder ? `placeholder="${this.escapeHtml(field.placeholder)}"` : ''}
                                    ${field.defaultValue ? `value="${this.escapeHtml(field.defaultValue)}"` : ''}
                                />
                                <div class="anonchat-error" style="display: none;"></div>
                            </div>
                        `).join('')}
                        <div class="anonchat-form-actions">
                            <button type="button" class="anonchat-form-btn anonchat-form-btn-secondary">Cancel</button>
                            <button type="submit" class="anonchat-form-btn anonchat-form-btn-primary">${this.escapeHtml(buttonText)}</button>
                        </div>
                    </form>
                </div>
            `;
            
            const form = modal.querySelector('.anonchat-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {};
                let valid = true;
                
                fields.forEach(field => {
                    const input = form.querySelector(`[name="${field.name}"]`);
                    const value = input.value.trim();
                    const errorDiv = input.closest('.anonchat-form-group').querySelector('.anonchat-error');
                    
                    if (field.required && !value) {
                        errorDiv.textContent = 'This field is required';
                        errorDiv.style.display = 'block';
                        valid = false;
                    } else if (field.name === 'code' && value.length !== 20) {
                        errorDiv.textContent = 'Code must be exactly 20 characters';
                        errorDiv.style.display = 'block';
                        valid = false;
                    } else {
                        errorDiv.style.display = 'none';
                        data[field.name] = value;
                    }
                });
                
                if (valid) {
                    onSubmit(data);
                }
            });
            
            return modal;
        },
        
        closeModal: function() {
            const modal = document.querySelector('.anonchat-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        },
        
        createRoom: function(nickname, roomName, container) {
            this.showLoading(container);
            
            const formData = new FormData();
            formData.append('action', 'anonchat_room');
            formData.append('action_type', 'create');
            formData.append('nickname', nickname);
            formData.append('room_name', roomName || '');
            formData.append('nonce', anonchatData.nonce);
            
            fetch(anonchatData.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentCode = data.data.code;
                    this.clientId = data.data.client_id;
                    this.closeModal();
                    this.renderWidget(container, data.data.room);
                    this.copyToClipboard(this.currentCode);
                    this.startPolling(container);
                } else {
                    this.showError(container, data.data.message || 'Failed to create room');
                }
            })
            .catch(error => {
                this.showError(container, 'Network error. Please try again.');
            });
        },
        
        joinRoom: function(code, nickname, container) {
            this.showLoading(container);
            
            const formData = new FormData();
            formData.append('action', 'anonchat_room');
            formData.append('action_type', 'join');
            formData.append('code', code);
            formData.append('nickname', nickname);
            formData.append('nonce', anonchatData.nonce);
            
            fetch(anonchatData.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentCode = code;
                    this.clientId = data.data.client_id;
                    this.closeModal();
                    this.renderWidget(container, data.data.room);
                    this.startPolling(container);
                } else {
                    this.showError(container, data.data.message || 'Failed to join room');
                }
            })
            .catch(error => {
                this.showError(container, 'Network error. Please try again.');
            });
        },
        
        renderWidget: function(container, room) {
            const buttons = container.querySelector('.anonchat-buttons');
            const widgetDiv = container.querySelector('.anonchat-widget');
            
            if (buttons) buttons.style.display = 'none';
            
            const onlineCount = Object.keys(room.users || {}).length;
            const timeLeft = this.calculateTimeLeft(room.created, room.last_activity);
            
            const shareUrl = window.location.origin + window.location.pathname + '?anonchat=' + this.currentCode;
            
            widgetDiv.innerHTML = `
                <div class="anonchat-header">
                    <div class="anonchat-room-info">
                        <div class="anonchat-room-name">${this.escapeHtml(room.name || 'Anonymous Chat')}</div>
                        <div class="anonchat-room-code">
                            <div class="anonchat-code-label">Share this code with other participants:</div>
                            <div class="anonchat-code-row">
                                <span class="anonchat-code-text">${this.currentCode}</span>
                                <button class="anonchat-copy-btn" data-code="${this.currentCode}">Copy Code</button>
                            </div>
                            <div class="anonchat-share-link">
                                <div class="anonchat-link-label">Full link to this chat:</div>
                                <div class="anonchat-link-row">
                                    <input type="text" class="anonchat-link-input" value="${shareUrl}" readonly />
                                    <button class="anonchat-copy-link-btn" data-url="${shareUrl}">Copy Link</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="anonchat-stats">
                        <div class="anonchat-stat">
                            <span class="anonchat-stat-value">${onlineCount}</span>
                            <span>Online</span>
                        </div>
                        <div class="anonchat-stat">
                            <span class="anonchat-stat-value" data-time-left="${timeLeft}">${this.formatTime(timeLeft)}</span>
                            <span>Time Left</span>
                        </div>
                    </div>
                    <div class="anonchat-actions">
                        <button class="anonchat-kill-btn">Kill This Chat Room</button>
                    </div>
                </div>
                <div class="anonchat-messages" data-last-time="${this.lastMessageTime}"></div>
                <div class="anonchat-input-area">
                    <input type="text" class="anonchat-input" placeholder="Type a message..." maxlength="500" />
                    <button class="anonchat-send-btn">Send</button>
                </div>
            `;
            
            widgetDiv.style.display = 'block';
            this.widget = widgetDiv;
            
            // Render messages
            this.renderMessages(room.messages || []);
            
            // Setup copy code button
            const copyBtn = widgetDiv.querySelector('.anonchat-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    this.copyToClipboard(this.currentCode);
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                });
            }
            
            // Setup copy link button
            const copyLinkBtn = widgetDiv.querySelector('.anonchat-copy-link-btn');
            if (copyLinkBtn) {
                copyLinkBtn.addEventListener('click', () => {
                    const url = copyLinkBtn.dataset.url;
                    this.copyToClipboard(url);
                    const originalText = copyLinkBtn.textContent;
                    copyLinkBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyLinkBtn.textContent = 'Copy Link';
                    }, 2000);
                });
            }
            
            // Setup kill room button
            const killBtn = widgetDiv.querySelector('.anonchat-kill-btn');
            if (killBtn) {
                killBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this chat room? This action cannot be undone.')) {
                        this.killRoom(container);
                    }
                });
            }
            
            // Start countdown timer
            this.startCountdown(widgetDiv);
        },
        
        renderMessages: function(messages) {
            const messagesDiv = this.widget.querySelector('.anonchat-messages');
            if (!messagesDiv) return;
            
            const lastTime = parseInt(messagesDiv.dataset.lastTime) || 0;
            let hasNew = false;
            let maxTime = lastTime;
            
            // First render: show all messages, subsequent renders: only new ones
            const isFirstRender = lastTime === 0;
            
            if (isFirstRender) {
                // Clear and render all messages on first render
                messagesDiv.innerHTML = '';
                messages.forEach(msg => {
                    maxTime = Math.max(maxTime, msg.time);
                    const messageEl = document.createElement('div');
                    messageEl.className = 'anonchat-message';
                    
                    if (msg.type === 'system') {
                        messageEl.className += ' anonchat-message-system';
                        messageEl.textContent = this.escapeHtml(msg.message);
                    } else {
                        messageEl.className += ' anonchat-message-user';
                        messageEl.innerHTML = `
                            <div class="anonchat-message-nickname">${this.escapeHtml(msg.nickname || 'Anonymous')}</div>
                            <div class="anonchat-message-text">${this.escapeHtml(msg.message)}</div>
                            <div class="anonchat-message-time">${this.formatMessageTime(msg.time)}</div>
                        `;
                    }
                    
                    messagesDiv.appendChild(messageEl);
                });
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            } else {
                // Only render new messages
                messages.forEach(msg => {
                    if (msg.time > lastTime) {
                        hasNew = true;
                        maxTime = Math.max(maxTime, msg.time);
                        const messageEl = document.createElement('div');
                        messageEl.className = 'anonchat-message';
                        
                        if (msg.type === 'system') {
                            messageEl.className += ' anonchat-message-system';
                            messageEl.textContent = this.escapeHtml(msg.message);
                        } else {
                            messageEl.className += ' anonchat-message-user';
                            messageEl.innerHTML = `
                                <div class="anonchat-message-nickname">${this.escapeHtml(msg.nickname || 'Anonymous')}</div>
                                <div class="anonchat-message-text">${this.escapeHtml(msg.message)}</div>
                                <div class="anonchat-message-time">${this.formatMessageTime(msg.time)}</div>
                            `;
                        }
                        
                        messagesDiv.appendChild(messageEl);
                    }
                });
                
                if (hasNew) {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            }
            
            messagesDiv.dataset.lastTime = maxTime;
        },
        
        sendMessage: function() {
            const input = this.widget?.querySelector('.anonchat-input');
            const sendBtn = this.widget?.querySelector('.anonchat-send-btn');
            
            if (!input || !sendBtn) return;
            
            const message = input.value.trim();
            if (!message || !this.currentCode || !this.clientId) return;
            
            sendBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('action', 'anonchat_room');
            formData.append('action_type', 'send');
            formData.append('code', this.currentCode);
            formData.append('client_id', this.clientId);
            formData.append('message', message);
            formData.append('nonce', anonchatData.nonce);
            
            fetch(anonchatData.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                sendBtn.disabled = false;
                if (data.success) {
                    input.value = '';
                    this.renderMessages(data.data.room.messages || []);
                } else {
                    alert(data.data.message || 'Failed to send message');
                }
            })
            .catch(error => {
                sendBtn.disabled = false;
                alert('Network error. Please try again.');
            });
        },
        
        startPolling: function(container) {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
            }
            
            this.pollTimer = setInterval(() => {
                if (!this.currentCode || !this.clientId) return;
                
                const url = `${anonchatData.ajaxUrl}?action=anonchat_room&action_type=get&code=${this.currentCode}&client_id=${this.clientId}&t=${Date.now()}`;
                
                fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const room = data.data.room;
                        this.updateWidget(room);
                    } else {
                        if (data.data.message === 'Room expired' || data.data.message === 'Room not found') {
                            this.showExpired(container);
                            this.stopPolling();
                        }
                    }
                })
                .catch(error => {
                    console.error('Polling error:', error);
                });
            }, anonchatData.pollInterval);
        },
        
        stopPolling: function() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },
        
        updateWidget: function(room) {
            if (!this.widget) return;
            
            // Update online count
            const onlineCount = Object.keys(room.users || {}).length;
            const statValue = this.widget.querySelector('.anonchat-stat-value');
            if (statValue) {
                statValue.textContent = onlineCount;
            }
            
            // Update messages
            this.renderMessages(room.messages || []);
            
            // Update time left
            const timeLeftEl = this.widget.querySelector('[data-time-left]');
            if (timeLeftEl) {
                const timeLeft = this.calculateTimeLeft(room.created, room.last_activity);
                timeLeftEl.textContent = this.formatTime(timeLeft);
                timeLeftEl.dataset.timeLeft = timeLeft;
            }
        },
        
        startCountdown: function(widget) {
            setInterval(() => {
                const timeLeftEl = widget.querySelector('[data-time-left]');
                if (timeLeftEl) {
                    let timeLeft = parseInt(timeLeftEl.dataset.timeLeft) || 0;
                    if (timeLeft > 0) {
                        timeLeft--;
                        timeLeftEl.dataset.timeLeft = timeLeft;
                        timeLeftEl.textContent = this.formatTime(timeLeft);
                    }
                }
            }, 1000);
        },
        
        calculateTimeLeft: function(created, lastActivity) {
            // Max lifetime is 24 hours, inactivity is 6 hours
            const maxLifetime = 86400; // 24 hours
            const maxInactivity = 21600; // 6 hours
            const now = Math.floor(Date.now() / 1000);
            
            const timeSinceCreated = now - created;
            const timeSinceActivity = now - lastActivity;
            
            const lifetimeLeft = maxLifetime - timeSinceCreated;
            const inactivityLeft = maxInactivity - timeSinceActivity;
            
            return Math.max(0, Math.min(lifetimeLeft, inactivityLeft));
        },
        
        formatTime: function(seconds) {
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
            return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        },
        
        formatMessageTime: function(timestamp) {
            const date = new Date(timestamp * 1000);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            return date.toLocaleDateString();
        },
        
        copyToClipboard: function(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        },
        
        showLoading: function(container) {
            const widget = container.querySelector('.anonchat-widget');
            if (widget) {
                widget.innerHTML = '<div class="anonchat-loading">Loading...</div>';
                widget.style.display = 'block';
            }
        },
        
        showError: function(container, message) {
            const widget = container.querySelector('.anonchat-widget');
            if (widget) {
                widget.innerHTML = `<div class="anonchat-loading" style="color: #d63638;">${this.escapeHtml(message)}</div>`;
                widget.style.display = 'block';
            }
            this.closeModal();
        },
        
        showExpired: function(container) {
            const widget = container.querySelector('.anonchat-widget');
            if (widget) {
                widget.innerHTML = '<div class="anonchat-loading" style="color: #d63638;">Room expired. Please create or join a new room.</div>';
            }
            const buttons = container.querySelector('.anonchat-buttons');
            if (buttons) buttons.style.display = 'flex';
        },
        
        killRoom: function(container) {
            if (!this.currentCode || !this.clientId) return;
            
            const formData = new FormData();
            formData.append('action', 'anonchat_room');
            formData.append('action_type', 'kill');
            formData.append('code', this.currentCode);
            formData.append('client_id', this.clientId);
            formData.append('nonce', anonchatData.nonce);
            
            fetch(anonchatData.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.stopPolling();
                    this.currentCode = null;
                    this.clientId = null;
                    const widget = container.querySelector('.anonchat-widget');
                    if (widget) {
                        widget.innerHTML = '<div class="anonchat-loading" style="color: #d63638;">Chat room has been deleted.</div>';
                    }
                    const buttons = container.querySelector('.anonchat-buttons');
                    if (buttons) buttons.style.display = 'flex';
                } else {
                    alert(data.data.message || 'Failed to delete room');
                }
            })
            .catch(error => {
                alert('Network error. Please try again.');
            });
        },
        
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    AnonChat.init();
    
})();

