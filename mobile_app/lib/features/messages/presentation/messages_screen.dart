import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../alumni/presentation/alumni_directory_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _conversations = [];

  @override
  void initState() {
    super.initState();
    _fetchConversations();
  }

  Future<void> _fetchConversations() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/auth/conversations');
      if (res.data is List) {
        setState(() {
          _conversations = List<Map<String, dynamic>>.from(res.data);
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showNewConversationModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        String query = '';
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
              ),
              child: SizedBox(
                height: 480,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Nueva Conversación',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: context.primaryText,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                    Text(
                      'Elige a uno de tus contactos aceptados para chatear directamente.',
                      style: TextStyle(fontSize: 12, color: context.secondaryText),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'Buscar contacto...',
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onChanged: (val) {
                        setModalState(() => query = val.toLowerCase().trim());
                      },
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: FutureBuilder(
                        future: ApiClient.instance.get('/modulo1/connections'),
                        builder: (ctx, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
                          }
                          if (snapshot.hasError || snapshot.data?.data is! Map) {
                            return Center(
                              child: Text(
                                'Error al cargar tus conexiones',
                                style: TextStyle(color: context.secondaryText, fontSize: 12),
                              ),
                            );
                          }

                          final acceptedRaw = snapshot.data!.data['accepted'] as List? ?? [];
                          final acceptedList = acceptedRaw
                              .whereType<Map>()
                              .map((e) => Map<String, dynamic>.from(e))
                              .where((c) {
                            if (query.isEmpty) return true;
                            final name = (c['target_name'] ?? c['requester_name'] ?? '').toString().toLowerCase();
                            final prog = (c['target_program'] ?? c['requester_program'] ?? '').toString().toLowerCase();
                            return name.contains(query) || prog.contains(query);
                          }).toList();

                          if (acceptedList.isEmpty) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.people_outline_rounded, size: 48, color: context.tertiaryText),
                                    const SizedBox(height: 10),
                                    Text(
                                      query.isEmpty
                                          ? 'Aún no tienes conexiones aceptadas'
                                          : 'No se encontraron contactos para "$query"',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: context.secondaryText,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    if (query.isEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        'Conecta con otros egresados desde la sección de Red para comenzar a chatear.',
                                        style: TextStyle(fontSize: 11.5, color: context.tertiaryText),
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: 12),
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppTheme.primaryColor,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                        onPressed: () {
                                          Navigator.pop(modalCtx);
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(builder: (_) => const AlumniDirectoryScreen()),
                                          );
                                        },
                                        icon: const Icon(Icons.people_alt_rounded, size: 16, color: Colors.white),
                                        label: const Text('Explorar Red de Egresados', style: TextStyle(color: Colors.white, fontSize: 12)),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          }

                          return ListView.separated(
                            itemCount: acceptedList.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (ctx, idx) {
                              final conn = acceptedList[idx];
                              final peerName = conn['target_name'] ?? conn['requester_name'] ?? 'Contacto';
                              final peerProg = conn['target_program'] ?? conn['requester_program'] ?? 'Egresado UPC';
                              final peerUserId = conn['target_user_id'] ?? conn['requester_user_id'];
                              final peerPhoto = conn['target_picture_url'] ?? conn['requester_picture_url'];

                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: context.surfaceColor,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: context.borderColor),
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: AppTheme.brand500.withValues(alpha: 0.15),
                                      backgroundImage: peerPhoto != null ? NetworkImage(peerPhoto.toString()) : null,
                                      child: peerPhoto == null
                                          ? Text(
                                              peerName.toString().isNotEmpty ? peerName.toString()[0].toUpperCase() : 'U',
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                            )
                                          : null,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            peerName.toString(),
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 13,
                                              color: context.primaryText,
                                            ),
                                          ),
                                          Text(
                                            peerProg.toString(),
                                            style: TextStyle(fontSize: 11, color: context.secondaryText),
                                          ),
                                        ],
                                      ),
                                    ),
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.brand500,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                      onPressed: () async {
                                        if (peerUserId == null) return;
                                        try {
                                          final res = await ApiClient.instance.post('/auth/conversations', data: {
                                            'context_type': 'DIRECT',
                                            'participant_ids': [peerUserId],
                                          });

                                          if (mounted) {
                                            Navigator.pop(modalCtx);
                                            await _fetchConversations();
                                            final convId = res.data['id'];
                                            if (convId != null) {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) => ChatDetailScreen(
                                                    conversationId: convId as int,
                                                    title: peerName.toString(),
                                                  ),
                                                ),
                                              );
                                            }
                                          }
                                        } catch (_) {
                                          if (mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Error al iniciar la conversación')),
                                            );
                                          }
                                        }
                                      },
                                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 14, color: Colors.white),
                                      label: const Text('Chatear', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                                    ),
                                  ],
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: const Text('Mensajería Directa'),
        backgroundColor: context.surfaceColor,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchConversations,
          ),
          IconButton(
            tooltip: 'Nueva conversación',
            icon: const Icon(Icons.edit_note_rounded),
            onPressed: _showNewConversationModal,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryColor,
        onPressed: _showNewConversationModal,
        icon: const Icon(Icons.edit_note_rounded, color: Colors.white),
        label: const Text(
          'Nueva Conversación',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : _conversations.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded, size: 56, color: context.tertiaryText),
                        const SizedBox(height: 12),
                        Text(
                          'No tienes conversaciones activas',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: context.secondaryText,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Inicia una charla directa con tus conexiones aceptadas.',
                          style: TextStyle(
                            fontSize: 12,
                            color: context.tertiaryText,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          ),
                          onPressed: _showNewConversationModal,
                          icon: const Icon(Icons.add_comment_rounded, color: Colors.white, size: 18),
                          label: const Text('Iniciar Nueva Conversación', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                  itemCount: _conversations.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final conv = _conversations[i];
                    final unread = conv['unread_count'] ?? 0;
                    final lastMsg = conv['last_message']?['body'] ?? 'Conversación iniciada';
                    final title = conv['title'] ?? 'Contacto UPC';

                    return InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatDetailScreen(conversationId: conv['id'], title: title),
                          ),
                        );
                        _fetchConversations();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: context.surfaceColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: context.borderColor),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: AppTheme.brand500.withValues(alpha: 0.15),
                              child: Text(
                                title.isNotEmpty ? title[0].toUpperCase() : 'C',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      color: context.primaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    lastMsg,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: context.secondaryText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (unread > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.brand500,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '$unread',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class ChatDetailScreen extends StatefulWidget {
  final int conversationId;
  final String title;

  const ChatDetailScreen({super.key, required this.conversationId, required this.title});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  String? _currentUserEmail;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _fetchMessages();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _fetchMessages(silent: true));
  }

  Future<void> _loadCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userDataStr = prefs.getString('user_data');
      if (userDataStr != null) {
        final u = jsonDecode(userDataStr);
        if (u is Map && u['email'] != null) {
          setState(() => _currentUserEmail = u['email'].toString().toLowerCase());
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _fetchMessages({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/auth/conversations/${widget.conversationId}');
      if (res.data != null && res.data['messages'] is List) {
        if (mounted) {
          setState(() {
            _messages = List<Map<String, dynamic>>.from(res.data['messages']);
          });
          if (!silent) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
          }
        }
      }
    } catch (_) {
    } finally {
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;

    _msgCtrl.clear();
    try {
      await ApiClient.instance.post(
        '/auth/conversations/${widget.conversationId}/messages',
        data: {'body': text},
      );
      await _fetchMessages(silent: true);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar mensaje: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: context.surfaceColor,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'No hay mensajes aún. ¡Saluda!',
                          style: TextStyle(color: context.secondaryText, fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (ctx, i) {
                          final msg = _messages[i];
                          final senderEmail = (msg['sender_email'] ?? '').toString();
                          final body = msg['body'] ?? '';
                          final createdStr = msg['created_at']?.toString() ?? '';
                          DateTime? dt;
                          try {
                            dt = DateTime.parse(createdStr);
                          } catch (_) {}
                          final timeFormatted = dt != null ? DateFormat('hh:mm a').format(dt) : '';

                          final isMe = _currentUserEmail != null &&
                              senderEmail.toLowerCase() == _currentUserEmail;

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.78,
                              ),
                              decoration: BoxDecoration(
                                color: isMe ? AppTheme.primaryColor : context.surfaceColor,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : 16),
                                ),
                                border: Border.all(
                                  color: isMe ? Colors.transparent : context.borderColor,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  if (!isMe)
                                    Text(
                                      senderEmail,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.bold,
                                        color: isMe ? Colors.white70 : AppTheme.primaryColor,
                                      ),
                                    ),
                                  if (!isMe) const SizedBox(height: 2),
                                  Text(
                                    body,
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      color: isMe ? Colors.white : context.primaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    timeFormatted,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      color: isMe ? Colors.white70 : context.tertiaryText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            color: context.surfaceColor,
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: InputDecoration(
                        hintText: 'Escribe un mensaje...',
                        hintStyle: TextStyle(color: context.tertiaryText, fontSize: 13),
                        filled: true,
                        fillColor: context.mutedColor,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sendMessage,
                    icon: const Icon(Icons.send_rounded, color: AppTheme.primaryColor),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
