import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _signIn() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      UiFx.reject();
      setState(() => _error = 'Enter your email and password');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthProvider>().signIn(email, password);
      UiFx.confirm();
    } catch (e) {
      UiFx.reject();
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.paper,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Wordmark
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: Brand.ink, width: 2.5),
                        shape: BoxShape.circle,
                      ),
                      child: Transform.rotate(
                        angle: -0.1,
                        child: const Text(
                          'N',
                          style: TextStyle(
                            color: Brand.ink,
                            fontFamily: Brand.fontMono,
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: 'Kanini', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Brand.ink)),
                          TextSpan(text: ' Field', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Brand.amberDeep)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                const Eyebrow('Field rep sign in'),
                const SizedBox(height: 6),
                const Text(
                  'Karibu back.',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Brand.ink, letterSpacing: -0.02),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Sign in with the email your route lead registered for you.',
                  style: TextStyle(color: Brand.inkSoft, fontSize: 14.5, height: 1.5),
                ),
                const SizedBox(height: 28),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFBE9E7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Brand.stampRed, width: 1),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Brand.stampRed, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  key: const ValueKey('login_email'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 16),
                TextField(
                  key: const ValueKey('login_password'),
                  controller: _passwordController,
                  obscureText: true,
                  onSubmitted: (_) => _signIn(),
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                const SizedBox(height: 22),
                AmberButton(_loading ? 'Signing in…' : 'Sign in', key: const ValueKey('login_submit'), onPressed: _signIn, loading: _loading),
                const SizedBox(height: 18),
                const Text(
                  'Trouble signing in? Contact your route lead.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Brand.inkSoft, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}