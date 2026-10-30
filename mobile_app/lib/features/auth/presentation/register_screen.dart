import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _documentIdController = TextEditingController();
  final _graduationYearController = TextEditingController(text: DateTime.now().year.toString());
  final _degreeActController = TextEditingController();
  final _diplomaController = TextEditingController();
  final _phoneController = TextEditingController();

  List<Map<String, dynamic>> _programs = const [
    {'id': 1, 'name': 'Ingeniería de Sistemas'},
    {'id': 2, 'name': 'Ingeniería Ambiental'},
    {'id': 3, 'name': 'Ingeniería Electrónica'},
    {'id': 4, 'name': 'Enfermería'},
    {'id': 5, 'name': 'Microbiología'},
    {'id': 6, 'name': 'Instrumentación Quirúrgica'},
    {'id': 7, 'name': 'Administración de Empresas'},
    {'id': 8, 'name': 'Contaduría Pública'},
    {'id': 9, 'name': 'Economía'},
    {'id': 10, 'name': 'Comercio Internacional'},
    {'id': 11, 'name': 'Derecho'},
    {'id': 12, 'name': 'Sociología'},
    {'id': 13, 'name': 'Psicología'},
    {'id': 14, 'name': 'Licenciatura en Matemáticas'},
    {'id': 15, 'name': 'Licenciatura en Lengua Castellana e Inglés'},
  ];
  int _selectedProgramId = 1;

  int _registerStep = 1; // 1: Credenciales + Datos de Grado, 2: Privacidad
  static const int _roleId = 3; // 3 = Egresado UPC (Exclusivo en app móvil)
  bool _obscurePassword = true;
  bool _acceptPrivacy = false;
  bool _authorizeData = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadPrograms();
  }

  Future<void> _loadPrograms() async {
    try {
      final res = await ApiClient.instance.get('/modulo1/public/programs');
      if (res.data is List && (res.data as List).isNotEmpty && mounted) {
        final loaded = (res.data as List)
            .whereType<Map>()
            .map((e) => {'id': e['id'] as int, 'name': e['name'].toString()})
            .toList();
        if (loaded.isNotEmpty) {
          setState(() {
            _programs = loaded;
            _selectedProgramId = loaded.first['id'] as int;
          });
        }
      }
    } catch (_) {
      // Usa lista oficial local si la red aún no responde
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _documentIdController.dispose();
    _graduationYearController.dispose();
    _degreeActController.dispose();
    _diplomaController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  int get _passwordStrength {
    final pwd = _passwordController.text;
    if (pwd.isEmpty) return 0;
    int score = 0;
    if (pwd.length > 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(pwd)) score++;
    if (RegExp(r'[0-9]').hasMatch(pwd)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pwd)) score++;
    return score;
  }

  Future<void> _handleNextStep() async {
    setState(() => _errorMessage = null);

    if (_registerStep == 1) {
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final firstName = _firstNameController.text.trim();
      final lastName = _lastNameController.text.trim();
      final documentId = _documentIdController.text.trim();
      final gradYear = int.tryParse(_graduationYearController.text.trim());
      final actNum = _degreeActController.text.trim();
      final dipNum = _diplomaController.text.trim();

      if (email.isEmpty || !email.contains('@')) {
        setState(() => _errorMessage = 'Ingresa un correo electrónico válido (Gmail, Hotmail, Outlook, etc.).');
        return;
      }
      if (firstName.isEmpty || lastName.isEmpty) {
        setState(() => _errorMessage = 'Ingresa tus nombres y apellidos completos.');
        return;
      }
      if (documentId.isEmpty) {
        setState(() => _errorMessage = 'Ingresa tu número de cédula o documento.');
        return;
      }
      if (gradYear == null || gradYear < 1976 || gradYear > DateTime.now().year + 1) {
        setState(() => _errorMessage = 'Ingresa un año de graduación válido.');
        return;
      }
      if (actNum.isEmpty && dipNum.isEmpty) {
        setState(() => _errorMessage = 'Ingresa tu número de acta de grado o número de diploma.');
        return;
      }
      if (password.length < 8 || _passwordStrength < 2) {
        setState(() => _errorMessage = 'La contraseña debe tener al menos 8 caracteres y cumplir los requisitos de seguridad.');
        return;
      }

      setState(() => _isLoading = true);
      try {
        await ApiClient.instance.post('/auth/validate-graduate-email', data: {
          'email': email,
        });

        if (mounted) {
          setState(() {
            _registerStep = 2;
            _errorMessage = null;
          });
        }
      } on DioException catch (e) {
        String msg = 'No se pudo conectar con el servidor.';
        if (e.response?.data != null && e.response?.data is Map) {
          msg = e.response?.data['detail']?.toString() ?? msg;
        }
        if (mounted) {
          setState(() => _errorMessage = msg);
        }
      } catch (e) {
        if (mounted) {
          setState(() => _errorMessage = 'Error al validar el correo: $e');
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitRegister() async {
    if (_registerStep < 2) {
      await _handleNextStep();
      return;
    }

    if (!_acceptPrivacy || !_authorizeData) {
      setState(() => _errorMessage = 'Debes aceptar las políticas y autorizar el tratamiento de datos para continuar.');
      return;
    }

    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Ingresa un correo electrónico válido.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.instance.post('/auth/register', data: {
        'email': email,
        'password': _passwordController.text,
        'role_id': _roleId,
        'first_name': _firstNameController.text.trim(),
        'last_name': _lastNameController.text.trim(),
        'document_id': _documentIdController.text.trim(),
        'program_id': _selectedProgramId,
        'graduation_year': int.tryParse(_graduationYearController.text.trim()) ?? DateTime.now().year,
        'degree_act_number': _degreeActController.text.trim().isEmpty ? null : _degreeActController.text.trim(),
        'diploma_number': _diplomaController.text.trim().isEmpty ? null : _diplomaController.text.trim(),
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'accept_privacy_policy': _acceptPrivacy,
        'authorize_data_treatment': _authorizeData,
      });

      final message = response.data is Map ? (response.data['message']?.toString() ?? '') : '';

      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/verify_email',
          arguments: {
            'email': email,
            'message': message,
          },
        );
      }
    } on DioException catch (e) {
      String msg = 'No se pudo conectar con el servidor. Intenta de nuevo.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        setState(() => _errorMessage = msg);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strength = _passwordStrength;
    final strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
    final strengthColors = [
      const Color(0xFFF87171),
      const Color(0xFFFB923C),
      const Color(0xFFFACC15),
      AppTheme.brand400,
      const Color(0xFF10B981),
    ];

    final stepSubtitle = _registerStep == 1
        ? 'Paso 1 de 2 · Credenciales institucionales'
        : 'Paso 2 de 2 · Privacidad y tratamiento de datos';

    return Scaffold(
      backgroundColor: context.bgColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Compact Institutional Top Banner ──
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: AppTheme.heroBannerGradient,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'UNIVERSIDAD POPULAR DEL CESAR',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.65),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Registro y Activación de Cuenta',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── 3-Step Registration Card (Exact match to web Login.tsx) ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 32),
              child: Container(
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: AppTheme.authCardRadius,
                  border: Border.all(color: context.borderColor),
                  boxShadow: AppTheme.premiumShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Card Header + 3-Step Progress Bar
                    Container(
                      padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: context.borderColor.withValues(alpha: 0.6))),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: AppTheme.primaryGradient,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Crear Cuenta',
                                      style: TextStyle(
                                        fontSize: 21,
                                        fontWeight: FontWeight.w900,
                                        color: context.primaryText,
                                        letterSpacing: -0.4,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      stepSubtitle,
                                      style: TextStyle(fontSize: 12, color: context.secondaryText),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: AppTheme.brand50,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(color: AppTheme.brand200),
                                ),
                                child: Text(
                                  'ETAPA $_registerStep/2',
                                  style: const TextStyle(
                                    color: AppTheme.brand700,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // 2-Step Indicator Bar
                          Row(
                            children: [
                              _buildStepPill(1, '1. Credenciales'),
                              const SizedBox(width: 8),
                              _buildStepPill(2, '2. Privacidad'),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Step Body
                    Padding(
                      padding: const EdgeInsets.all(22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── ETAPA 1: CORREO INSTITUCIONAL + CONTRASEÑA + REQUISITOS ──
                          if (_registerStep == 1) ...[
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppTheme.brand50,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppTheme.brand200),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.school_rounded, color: AppTheme.primaryColor, size: 20),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Registro Abierto de Egresados UPC',
                                          style: TextStyle(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.brand700,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Puedes usar cualquier correo (Gmail, Hotmail, Outlook o institucional). El Coordinador UPC verificará tu cédula y acta o diploma.',
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            color: context.secondaryText,
                                            height: 1.35,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),

                            Text(
                              'CORREO ELECTRÓNICO (PERSONAL O INSTITUCIONAL)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0,
                                color: context.secondaryText,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              onChanged: (_) => setState(() {}),
                              style: TextStyle(color: context.primaryText, fontSize: 15),
                              decoration: AppTheme.inputDecoration(
                                context,
                                label: 'Correo electrónico',
                                hint: 'ejemplo@gmail.com o @hotmail.com',
                                icon: Icons.mail_outline_rounded,
                              ),
                            ),
                            const SizedBox(height: 14),

                            Text(
                              'DATOS DE ACREDITACIÓN PARA COORDINACIÓN UPC',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0,
                                color: context.secondaryText,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _firstNameController,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'Nombres *',
                                      hint: 'Carlos',
                                      icon: Icons.person_outline_rounded,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _lastNameController,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'Apellidos *',
                                      hint: 'Zuleta',
                                      icon: Icons.badge_outlined,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _documentIdController,
                                    keyboardType: TextInputType.number,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'Cédula *',
                                      hint: '1065842910',
                                      icon: Icons.credit_card_rounded,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _graduationYearController,
                                    keyboardType: TextInputType.number,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'Año grado *',
                                      hint: '2024',
                                      icon: Icons.calendar_today_outlined,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            DropdownButtonFormField<int>(
                              value: _selectedProgramId,
                              isExpanded: true,
                              decoration: AppTheme.inputDecoration(
                                context,
                                label: 'Programa Académico UPC *',
                                hint: 'Selecciona tu programa',
                                icon: Icons.school_outlined,
                              ),
                              items: _programs
                                  .map(
                                    (p) => DropdownMenuItem<int>(
                                      value: p['id'] as int,
                                      child: Text(
                                        p['name'].toString(),
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(fontSize: 13.5, color: context.primaryText),
                                      ),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedProgramId = val);
                              },
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _degreeActController,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'N° Acta de Grado *',
                                      hint: 'ACTA-2024-120',
                                      icon: Icons.verified_outlined,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _diplomaController,
                                    style: TextStyle(color: context.primaryText, fontSize: 14),
                                    decoration: AppTheme.inputDecoration(
                                      context,
                                      label: 'o N° Diploma',
                                      hint: 'DIP-98412',
                                      icon: Icons.workspace_premium_outlined,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            Text(
                              'CONTRASEÑA',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0,
                                color: context.secondaryText,
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              onChanged: (_) => setState(() {}),
                              style: TextStyle(color: context.primaryText, fontSize: 15),
                              decoration: AppTheme.inputDecoration(
                                context,
                                label: 'Contraseña segura',
                                hint: '••••••••',
                                icon: Icons.lock_outline_rounded,
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                    color: context.tertiaryText,
                                    size: 20,
                                  ),
                                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                ),
                              ),
                            ),

                            if (_passwordController.text.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Row(
                                children: List.generate(4, (index) {
                                  return Expanded(
                                    child: Container(
                                      height: 6,
                                      margin: EdgeInsets.only(right: index < 3 ? 4 : 0),
                                      decoration: BoxDecoration(
                                        color: index < strength
                                            ? strengthColors[strength]
                                            : context.borderColor,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(height: 4),
                              Align(
                                alignment: Alignment.centerRight,
                                child: Text(
                                  strengthLabels[strength],
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: strengthColors[strength],
                                  ),
                                ),
                              ),
                            ],

                            const SizedBox(height: 12),
                            // Requisitos de seguridad
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: context.mutedColor,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: context.borderColor),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'REQUISITOS DE SEGURIDAD',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.0,
                                      color: context.secondaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 12,
                                    runSpacing: 8,
                                    children: [
                                      _buildReqItem('Mín. 8 caracteres', _passwordController.text.length >= 8),
                                      _buildReqItem('Una mayúscula', RegExp(r'[A-Z]').hasMatch(_passwordController.text)),
                                      _buildReqItem('Una minúscula', RegExp(r'[a-z]').hasMatch(_passwordController.text)),
                                      _buildReqItem('Un número', RegExp(r'[0-9]').hasMatch(_passwordController.text)),
                                      _buildReqItem('Carácter especial', RegExp(r'[^A-Za-z0-9]').hasMatch(_passwordController.text)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],

                          // ── ETAPA 2: AVISOS DE PRIVACIDAD Y TRATAMIENTO DE DATOS ──
                          if (_registerStep == 2) ...[
                            // Selected Email Summary Chip
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppTheme.brand50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.brand200),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'ACTIVACIÓN DE EGRESADO UPC',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.brand700,
                                            letterSpacing: 0.6,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _emailController.text.trim(),
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        const Row(
                                          children: [
                                            Icon(Icons.schedule_rounded, size: 13, color: Color(0xFFD97706)),
                                            SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                'Quedará pendiente de verificación por Coordinación UPC',
                                                style: TextStyle(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFFB45309),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      setState(() {
                                        _errorMessage = null;
                                        _registerStep = 1;
                                      });
                                    },
                                    child: const Text(
                                      'Cambiar correo',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.brand700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Consent Checkboxes Box
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: context.mutedColor,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: context.borderColor),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'CONSENTIMIENTO Y PROTECCIÓN DE DATOS (LEY 1581 DE 2012)',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.6,
                                      color: context.secondaryText,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Material(
                                    color: Colors.transparent,
                                    child: Column(
                                      children: [
                                        CheckboxListTile(
                                          value: _acceptPrivacy,
                                          onChanged: (v) => setState(() => _acceptPrivacy = v ?? false),
                                          activeColor: AppTheme.primaryColor,
                                          contentPadding: EdgeInsets.zero,
                                          controlAffinity: ListTileControlAffinity.leading,
                                          title: Text(
                                            'He leído y acepto el Aviso de Privacidad de la Universidad Popular del Cesar. *',
                                            style: TextStyle(fontSize: 12.5, color: context.primaryText, height: 1.35),
                                          ),
                                        ),
                                        const Divider(height: 8),
                                        CheckboxListTile(
                                          value: _authorizeData,
                                          onChanged: (v) => setState(() => _authorizeData = v ?? false),
                                          activeColor: AppTheme.primaryColor,
                                          contentPadding: EdgeInsets.zero,
                                          controlAffinity: ListTileControlAffinity.leading,
                                          title: Text(
                                            'Autorizo de manera previa, expresa e informada a la UPC para el Tratamiento de mis Datos Personales conforme a la Ley 1581 de 2012. *',
                                            style: TextStyle(fontSize: 12.5, color: context.primaryText, height: 1.35),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          if (_errorMessage != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 18),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!.replaceAll(RegExp(r'<[^>]*>'), ''),
                                      style: const TextStyle(
                                        color: Color(0xFFDC2626),
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 20),

                          // Navigation Buttons (Atrás / Continuar / Verificar y activar cuenta)
                          Row(
                            children: [
                              if (_registerStep > 1) ...[
                                OutlinedButton(
                                  onPressed: _isLoading
                                      ? null
                                      : () {
                                          setState(() {
                                            _errorMessage = null;
                                            _registerStep = 1;
                                          });
                                        },
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  ),
                                  child: const Text('Atrás', style: TextStyle(fontWeight: FontWeight.w700)),
                                ),
                                const SizedBox(width: 10),
                              ],
                              Expanded(
                                child: SizedBox(
                                  height: 50,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      gradient: AppTheme.primaryGradient,
                                      borderRadius: BorderRadius.circular(14),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF158A58).withValues(alpha: 0.28),
                                          blurRadius: 16,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: ElevatedButton(
                                      onPressed: _isLoading ? null : _submitRegister,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.transparent,
                                        shadowColor: Colors.transparent,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: _isLoading
                                          ? const SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.2),
                                            )
                                          : Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                Text(
                                                  _registerStep < 2
                                                      ? 'Continuar'
                                                      : 'Verificar y activar cuenta',
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 14.5,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                                if (_registerStep < 2) ...[
                                                  const SizedBox(width: 6),
                                                  const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 17),
                                                ],
                                              ],
                                            ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Footer Toggle
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 22),
                      decoration: BoxDecoration(
                        border: Border(top: BorderSide(color: context.borderColor.withValues(alpha: 0.6))),
                      ),
                      child: Center(
                        child: GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: RichText(
                            text: TextSpan(
                              text: '¿Ya tienes cuenta? ',
                              style: TextStyle(
                                color: context.secondaryText,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                              ),
                              children: const [
                                TextSpan(
                                  text: 'Inicia sesión',
                                  style: TextStyle(
                                    color: Color(0xFF158A58),
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepPill(int step, String label) {
    final active = _registerStep == step;
    final completed = _registerStep > step;

    return Expanded(
      child: GestureDetector(
        onTap: completed
            ? () {
                setState(() {
                  _errorMessage = null;
                  _registerStep = step;
                });
              }
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 6,
              decoration: BoxDecoration(
                color: completed
                    ? AppTheme.primaryColor
                    : active
                        ? AppTheme.brand500
                        : context.borderColor,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: active
                    ? AppTheme.brand700
                    : completed
                        ? context.primaryText
                        : context.tertiaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildReqItem(String label, bool met) {
    return SizedBox(
      width: 140,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 15,
            height: 15,
            decoration: BoxDecoration(
              color: met ? AppTheme.brand500 : context.borderColor,
              shape: BoxShape.circle,
            ),
            child: met ? const Icon(Icons.check, color: Colors.white, size: 10) : null,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: met ? FontWeight.w700 : FontWeight.w500,
                color: met ? AppTheme.brand700 : context.secondaryText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
