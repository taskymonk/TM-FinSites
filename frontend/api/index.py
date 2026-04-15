from http.server import BaseHTTPRequestHandler
import json
import uuid
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

from _github_db import read_json, write_json, list_dir, read_all_json, count_files
from _auth import check_admin, create_token, get_admin_from_request
from _audit_engine import perform_audit, run_compliance_checks, detect_registrations, calculate_scores

class handler(BaseHTTPRequestHandler):
    def _json(self, data, status=200, cookies=None):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        if cookies:
            for c in cookies:
                self.send_header('Set-Cookie', c)
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def _error(self, msg, status=400):
        self._json({"detail": msg}, status)

    def _body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length)) if length > 0 else {}

    def _path(self):
        return urlparse(self.path).path

    def _params(self):
        return parse_qs(urlparse(self.path).query)

    def _require_admin(self):
        admin = get_admin_from_request(self.headers)
        if not admin:
            self._error("Not authenticated", 401)
            return None
        return admin

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    # ==================== ROUTING ====================
    def do_GET(self):
        p = self._path()
        if p == '/api/health':
            self._json({"api": "ok", "storage": "github"})
        elif p == '/api/plans':
            plans = read_json('data/plans.json') or []
            self._json(plans)
        elif p == '/api/auth/me':
            admin = get_admin_from_request(self.headers)
            if admin:
                self._json({"email": admin, "name": "Admin", "role": "admin"})
            else:
                self._error("Not authenticated", 401)
        elif p == '/api/admin/stats':
            self._handle_admin_stats()
        elif p == '/api/admin/submissions':
            self._handle_admin_submissions()
        elif p.startswith('/api/admin/submissions/'):
            sid = p.split('/api/admin/submissions/')[1].split('/')[0]
            self._handle_admin_submission_detail(sid)
        elif p.startswith('/api/status/'):
            sid = p.split('/api/status/')[1]
            self._handle_status(sid)
        elif p.startswith('/api/audit/'):
            aid = p.split('/api/audit/')[1].split('/')[0]
            self._handle_audit_get(aid)
        elif p.startswith('/api/wizard/'):
            sid = p.split('/api/wizard/')[1].split('/')[0]
            self._handle_wizard_get(sid)
        else:
            self._error("Not found", 404)

    def do_POST(self):
        p = self._path()
        body = self._body()
        if p == '/api/audit/scan':
            self._handle_audit_scan(body)
        elif p == '/api/auth/login':
            self._handle_auth_login(body)
        elif p == '/api/auth/logout':
            self._json({"message": "Logged out"}, cookies=['access_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'])
        elif p == '/api/wizard/start':
            self._handle_wizard_start(body)
        elif '/submit' in p:
            sid = p.split('/api/wizard/')[1].split('/submit')[0]
            self._handle_wizard_submit(sid)
        elif p == '/api/contact/enterprise':
            self._handle_enterprise_contact(body)
        else:
            self._error("Not found", 404)

    def do_PUT(self):
        p = self._path()
        body = self._body()
        if '/step/' in p:
            parts = p.split('/api/wizard/')[1]
            sid = parts.split('/step/')[0]
            step = parts.split('/step/')[1]
            self._handle_wizard_step(sid, step, body)
        elif p.endswith('/status'):
            sid = p.split('/api/admin/submissions/')[1].split('/status')[0]
            self._handle_admin_status_update(sid, body)
        elif p.endswith('/business-type'):
            aid = p.split('/api/audit/')[1].split('/business-type')[0]
            self._handle_audit_business_type(aid, body)
        elif p.endswith('/payment'):
            sid = p.split('/api/admin/submissions/')[1].split('/payment')[0]
            self._handle_admin_payment(sid, body)
        else:
            self._error("Not found", 404)

    # ==================== AUTH ====================
    def _handle_auth_login(self, body):
        email = body.get('email', '')
        password = body.get('password', '')
        if not check_admin(email, password):
            self._error("Invalid email or password", 401)
            return
        token = create_token(email)
        self._json(
            {"email": email.strip().lower(), "name": "Admin", "role": "admin"},
            cookies=[f'access_token={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400']
        )

    # ==================== AUDIT ====================
    def _handle_audit_scan(self, body):
        url = body.get('url', '')
        if not url:
            self._error("URL is required")
            return
        result = perform_audit(url)
        write_json(f"data/audits/{result['audit_id']}.json", result, f"audit: {url}")
        self._json(result)

    def _handle_audit_get(self, audit_id):
        audit = read_json(f"data/audits/{audit_id}.json")
        if not audit:
            self._error("Audit not found", 404)
            return
        self._json(audit)

    def _handle_audit_business_type(self, audit_id, body):
        audit = read_json(f"data/audits/{audit_id}.json")
        if not audit:
            self._error("Audit not found", 404)
            return
        new_types = body.get('business_types', [])
        text = audit.get('_raw_text', '')
        links_text = audit.get('_raw_links', '')
        url = audit.get('url', '')
        registrations = audit.get('detected_data', {}).get('registrations', {})
        if text:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup('', 'html.parser')
            checks = run_compliance_checks(text, soup, new_types, registrations, url, links_text)
            scores = calculate_scores(checks)
            audit['compliance_report'] = {**scores, 'checks': checks}
        audit['detected_business_types'] = new_types
        write_json(f"data/audits/{audit_id}.json", audit, f"recheck: {', '.join(new_types)}")
        audit.pop('_raw_text', None)
        audit.pop('_raw_links', None)
        self._json(audit)

    # ==================== WIZARD ====================
    def _handle_wizard_start(self, body):
        session_id = str(uuid.uuid4())
        prefilled = {}
        audit_id = body.get('audit_id')
        if audit_id:
            audit = read_json(f"data/audits/{audit_id}.json")
            if audit and audit.get('detected_data'):
                d = audit['detected_data']
                prefilled = {
                    'step_1': {'business_types': audit.get('detected_business_types', [])},
                    'step_2': {'group_a': {'business_name': d.get('business_name', ''),
                        'email': (d.get('contact', {}).get('emails') or [''])[0],
                        'phone': (d.get('contact', {}).get('phones') or [''])[0],
                        'address': d.get('contact', {}).get('address', ''),
                        'social_links': d.get('social_links', {})}},
                }
        session = {
            'session_id': session_id, 'audit_id': audit_id, 'plan_id': body.get('plan_id', 'starter'),
            'contact': {'name': body.get('contact_name', ''), 'email': body.get('contact_email', ''), 'phone': body.get('contact_phone', '')},
            'current_step': 1, 'status': 'in_progress', 'business_types': prefilled.get('step_1', {}).get('business_types', []),
            'data': prefilled, 'prefilled_from_audit': bool(audit_id),
            'created_at': datetime.now(timezone.utc).isoformat(), 'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        write_json(f"data/sessions/{session_id}.json", session, f"wizard: new session")
        self._json(session)

    def _handle_wizard_get(self, session_id):
        session = read_json(f"data/sessions/{session_id}.json")
        if not session:
            self._error("Session not found", 404)
            return
        self._json(session)

    def _handle_wizard_step(self, session_id, step_num, body):
        session = read_json(f"data/sessions/{session_id}.json")
        if not session:
            self._error("Session not found", 404)
            return
        step_data = body.get('data', {})
        session.setdefault('data', {})[f'step_{step_num}'] = step_data
        session['current_step'] = max(int(step_num), session.get('current_step', 1))
        session['updated_at'] = datetime.now(timezone.utc).isoformat()
        if step_num == '1' and 'business_types' in step_data:
            session['business_types'] = step_data['business_types']
        write_json(f"data/sessions/{session_id}.json", session, f"wizard: save step {step_num}")
        self._json(session)

    def _handle_wizard_submit(self, session_id):
        session = read_json(f"data/sessions/{session_id}.json")
        if not session:
            self._error("Session not found", 404)
            return
        if session.get('status') == 'completed':
            self._error("Already submitted", 400)
            return
        ref_count = count_files('data/submissions')
        ref_number = f"FS-{datetime.now(timezone.utc).year}-{str(ref_count + 1).zfill(5)}"
        submission_id = str(uuid.uuid4())
        contact = session.get('contact', {})
        s2 = session.get('data', {}).get('step_2', {})
        ga = s2.get('group_a', {})
        submission = {
            'submission_id': submission_id, 'session_id': session_id, 'reference_number': ref_number,
            'audit_id': session.get('audit_id'), 'client_name': ga.get('business_name', contact.get('name', '')),
            'client_email': ga.get('email', contact.get('email', '')), 'client_phone': contact.get('phone', ''),
            'business_types': session.get('business_types', []),
            'plan': {'tier': session.get('plan_id', 'starter')},
            'status': 'submitted',
            'status_history': [{'status': 'submitted', 'at': datetime.now(timezone.utc).isoformat(), 'by': 'system', 'note': 'Wizard completed'}],
            'data': session.get('data', {}),
            'payment': {'status': 'pending', 'amount': None, 'method': None},
            'submitted_at': datetime.now(timezone.utc).isoformat(),
        }
        write_json(f"data/submissions/{ref_number}.json", submission, f"submission: {ref_number}")
        session['status'] = 'completed'
        write_json(f"data/sessions/{session_id}.json", session, f"wizard: completed")
        self._json({'submission_id': submission_id, 'reference_number': ref_number})

    # ==================== STATUS (PUBLIC) ====================
    def _handle_status(self, sid):
        sub = None
        files = list_dir('data/submissions')
        for f in files:
            data = read_json(f'data/submissions/{f}')
            if data and (data.get('submission_id') == sid or data.get('reference_number') == sid):
                sub = data
                break
        if not sub:
            self._error("Submission not found", 404)
            return
        self._json({k: sub.get(k) for k in ['submission_id', 'reference_number', 'client_name', 'status', 'plan', 'business_types', 'status_history', 'payment', 'submitted_at']})

    # ==================== ENTERPRISE CONTACT ====================
    def _handle_enterprise_contact(self, body):
        contact_id = str(uuid.uuid4())
        doc = {'contact_id': contact_id, 'name': body.get('name', ''), 'email': body.get('email', ''), 'phone': body.get('phone', ''),
            'company': body.get('company', ''), 'message': body.get('message', ''), 'status': 'new', 'created_at': datetime.now(timezone.utc).isoformat()}
        write_json(f"data/contacts/{contact_id}.json", doc, f"enterprise: {body.get('name', '')}")
        self._json({'contact_id': contact_id, 'message': 'Thank you! Our team will contact you within 24 hours.'})

    # ==================== ADMIN ====================
    def _handle_admin_stats(self):
        if not self._require_admin():
            return
        subs = read_all_json('data/submissions', 500)
        by_status = {}
        by_type = {}
        for s in subs:
            st = s.get('status', 'unknown')
            by_status[st] = by_status.get(st, 0) + 1
            for t in s.get('business_types', []):
                by_type[t] = by_type.get(t, 0) + 1
        self._json({'total_submissions': len(subs), 'by_status': by_status, 'by_type': by_type,
            'total_audits': count_files('data/audits'), 'enterprise_leads': count_files('data/contacts')})

    def _handle_admin_submissions(self):
        if not self._require_admin():
            return
        params = self._params()
        status_filter = params.get('status', [None])[0]
        search = params.get('search', [None])[0]
        subs = read_all_json('data/submissions', 200)
        if status_filter:
            subs = [s for s in subs if s.get('status') == status_filter]
        if search:
            sl = search.lower()
            subs = [s for s in subs if sl in s.get('client_name', '').lower() or sl in s.get('client_email', '').lower() or sl in s.get('reference_number', '').lower()]
        safe = [{k: s.get(k) for k in ['submission_id', 'reference_number', 'client_name', 'client_email', 'client_phone', 'business_types', 'plan', 'status', 'payment', 'submitted_at']} for s in subs]
        self._json({'submissions': safe, 'total': len(safe), 'page': 1, 'pages': 1})

    def _handle_admin_submission_detail(self, sid):
        if not self._require_admin():
            return
        sub = None
        for f in list_dir('data/submissions'):
            data = read_json(f'data/submissions/{f}')
            if data and data.get('submission_id') == sid:
                sub = data
                break
        if not sub:
            self._error("Submission not found", 404)
            return
        self._json(sub)

    def _handle_admin_status_update(self, sid, body):
        admin = self._require_admin()
        if not admin:
            return
        for f in list_dir('data/submissions'):
            data = read_json(f'data/submissions/{f}')
            if data and data.get('submission_id') == sid:
                data['status'] = body.get('status', data['status'])
                data.setdefault('status_history', []).append({'status': body['status'], 'at': datetime.now(timezone.utc).isoformat(), 'by': admin, 'note': body.get('note', '')})
                data['updated_at'] = datetime.now(timezone.utc).isoformat()
                write_json(f'data/submissions/{f}', data, f"status: {body['status']}")
                self._json({'message': 'Status updated', 'status': body['status']})
                return
        self._error("Submission not found", 404)

    def _handle_admin_payment(self, sid, body):
        admin = self._require_admin()
        if not admin:
            return
        for f in list_dir('data/submissions'):
            data = read_json(f'data/submissions/{f}')
            if data and data.get('submission_id') == sid:
                data['payment'] = {'status': body.get('status', 'pending'), 'amount': body.get('amount'), 'method': body.get('method'), 'note': body.get('note')}
                if body.get('status') == 'received':
                    data['status'] = 'payment_received'
                data.setdefault('status_history', []).append({'status': f"payment_{body.get('status')}", 'at': datetime.now(timezone.utc).isoformat(), 'by': admin, 'note': body.get('note', '')})
                write_json(f'data/submissions/{f}', data, f"payment: {body.get('status')}")
                self._json({'message': 'Payment updated'})
                return
        self._error("Submission not found", 404)
