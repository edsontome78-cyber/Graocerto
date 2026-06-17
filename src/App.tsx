/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Smartphone, 
  Bluetooth, 
  Printer, 
  CheckCircle2, 
  TrendingDown, 
  FileCheck, 
  Share2, 
  FolderSync, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  BookOpen,
  Download,
  X,
  Lock,
  Mail,
  UserPlus,
  LogOut,
  Users,
  ShieldCheck,
  UserCheck,
  RotateCw,
  Warehouse,
  Archive,
  Eye,
  Sprout,
  Sun,
  Moon
} from 'lucide-react';
import { FarmerReport, GrainType, GRAIN_PRESETS } from './types';
import { calculateGrainDiscounts } from './utils/classification';
import ClassifierForm from './components/ClassifierForm';
import WarehouseBalance from './components/WarehouseBalance';
import ReportHistory from './components/ReportHistory';
import LaudoPreview from './components/LaudoPreview';
import PrinterSimulator from './components/PrinterSimulator';
import harvestBackground from './assets/images/harvest_background_1779661627822.png';

// Initial preseed mock record so the user has immediate data to test
const SEED_REPORTS: FarmerReport[] = [
  {
    id: 'milho-bela-vista',
    reportNumber: 15420,
    date: '2026-05-24T18:30:00.000Z',
    farmerName: 'Edson Tomé',
    farmName: 'Fazenda Bela Vista',
    cityState: 'Piracicaba / SP',
    lotReference: 'LOTE-A24',
    vehiclePlate: 'AGR-2026',
    operatorName: 'Técnico Agrícola Tomé',
    sample: {
      grainType: 'MILHO',
      totalWeight: 14500,
      rawFieldSampleWeight: 500,
      officialSampleWeight: 100,
      impurityGrams: 1.5,
      damagedGrams: 6.2,
      brokenGrams: 4.8,
      moisture: 16.5
    },
    result: {
      sampleDiscountMoisture: 2.91,
      sampleDiscountImpurity: 0.5,
      sampleDiscountDamaged: 1.2,
      sampleDiscountBroken: 0.45,
      sampleTotalDiscounts: 5.06,
      sampleFinalNetWeight: 94.94,

      discountMoistureWeight: 422,
      discountImpurityWeight: 73,
      discountDamagedWeight: 174,
      discountBrokenWeight: 131,
      totalDiscounts: 800,
      finalNetWeight: 13700,
      moisturePercent: 16.5,
      impurityPercent: 1.5,
      damagedPercent: 6.2,
      brokenPercent: 4.8,
      hasDeduction: true,
      classificationGrade: 'TIPO 2 (Adequado)'
    },
    notes: 'Amostra colhida ontem no Talhão 4. Classificação com determinador de umificação aferido.'
  }
];

interface AppUser {
  email: string;
  name: string;
  password?: string;
  approved: boolean;
  role: 'admin' | 'user';
  createdAt: string;
  plan?: 'CORRETOR' | 'PRODUTOR';
  active?: boolean;
}

const DEFAULT_USERS: AppUser[] = [
  {
    email: 'edsontome78@gmail.com',
    name: 'Edson Tomé',
    password: '@Scul3d3nado',
    approved: true,
    role: 'admin',
    createdAt: '2026-05-24 22:09:07',
    plan: 'PRODUTOR'
  },
  {
    email: 'marcia.agrominas@gmail.com',
    name: 'Márcia Silva',
    password: 'agro123_password',
    approved: false,
    role: 'user',
    createdAt: '25/05/2026 09:12',
    plan: 'CORRETOR'
  },
  {
    email: 'thiago.safra@gmail.com',
    name: 'Thiago Peixoto',
    password: 'safra123_password',
    approved: false,
    role: 'user',
    createdAt: '25/05/2026 10:33',
    plan: 'PRODUTOR'
  }
];

export default function App() {
  const [reports, setReports] = useState<FarmerReport[]>(() => {
    try {
      const saved = localStorage.getItem('graocert_reports');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Falha ao ler localStorage, utilizando semente padrão.', e);
    }
    return SEED_REPORTS;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('graocert_users');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    try {
      localStorage.setItem('graocert_users', JSON.stringify(DEFAULT_USERS));
    } catch (e) {
      console.warn('Failed to write default users to localStorage:', e);
    }
    return DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('graocert_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email === 'edsontome78@gmail.com') {
          parsed.role = 'admin';
          parsed.approved = true;
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(SEED_REPORTS[0].id);
  const [currentTab, setCurrentTab] = useState<'cultura' | 'armazem' | 'arquivo' | 'inspetor'>('cultura');
  
  // Swipe and Tab Navigation Direction
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  
  const changeTab = (newTab: 'cultura' | 'armazem' | 'arquivo' | 'inspetor') => {
    const TABS = ['cultura', 'armazem', 'arquivo', 'inspetor'];
    const currentIndex = TABS.indexOf(currentTab);
    const newIndex = TABS.indexOf(newTab);
    if (currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 'next' : 'prev');
    }
    setCurrentTab(newTab);
  };

  // Touch Swipe Gesture Refs and Handlers
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input') || 
      target.closest('select') || 
      target.closest('textarea') || 
      target.closest('button') || 
      target.closest('canvas') ||
      target.closest('table') ||
      target.closest('svg') ||
      target.closest('.no-swipe')
    ) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;
    
    // Require at least 60px horizontal drag, and make sure it's mostly horizontal (not scrolling vertically)
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 80) {
      const MAIN_TABS: ('cultura' | 'armazem' | 'arquivo')[] = ['cultura', 'armazem', 'arquivo'];
      const currentIndex = MAIN_TABS.indexOf(currentTab as any);
      
      if (currentIndex !== -1) {
        if (diffX < 0) {
          // Swipe left -> Next tab
          if (currentIndex < MAIN_TABS.length - 1) {
            const nextTab = MAIN_TABS[currentIndex + 1];
            changeTab(nextTab);
            pushActivityLog(`Aba trocada para "${nextTab === 'cultura' ? 'Cultura Analisada' : nextTab === 'armazem' ? 'Saldo Armazém' : 'Arquivo Central'}" por gesto de deslizar.`);
          }
        } else {
          // Swipe right -> Previous tab
          if (currentIndex > 0) {
            const prevTab = MAIN_TABS[currentIndex - 1];
            changeTab(prevTab);
            pushActivityLog(`Aba trocada para "${prevTab === 'cultura' ? 'Cultura Analisada' : prevTab === 'armazem' ? 'Saldo Armazém' : 'Arquivo Central'}" por gesto de deslizar.`);
          }
        }
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const [activeRightTab, setActiveRightTab] = useState<'cert' | 'printer' | 'admin'>('cert');
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);
  const [showExportGuide, setShowExportGuide] = useState(true);
  const [activityLogs, setActivityLogs] = useState<string[]>(['Sistema inicializado.']);
  const [currentUtcTime, setCurrentUtcTime] = useState('2026-05-24 22:09:07');
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmailToConfirmDelete, setUserEmailToConfirmDelete] = useState<string | null>(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showLogoDropdown, setShowLogoDropdown] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminViewTab, setAdminViewTab] = useState<'pending' | 'approved' | 'active' | 'inactive' | 'all'>('all');
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmailField, setEditUserEmailField] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserPlan, setEditUserPlan] = useState<'CORRETOR' | 'PRODUTOR'>('PRODUTOR');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('graocert_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('graocert_theme', theme);
      const root = document.getElementById('root-container');
      if (root) {
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    } catch {}
  }, [theme]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showAndroidInstallModal, setShowAndroidInstallModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  // Auth Form Input States
  const [activeLoginTab, setActiveLoginTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPlan, setRegisterPlan] = useState<'CORRETOR' | 'PRODUTOR'>('CORRETOR');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      pushActivityLog("Grãocerto Pro pronto para instalação rápida!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowAndroidInstallModal(true);
      return;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pushActivityLog("Instalação aceita pelo produtor.");
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Erro ao disparar prompt:', err);
      setShowAndroidInstallModal(true);
    }
  };

  // Dynamic Clock simulation matching "2026-05-24 22:09:07" UTC
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const format = now.toISOString().replace('T', ' ').substring(0, 19);
      setCurrentUtcTime(format);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync users and reports from remote Express backend periodically
  const syncFromRemote = async () => {
    try {
      const resUsers = await fetch('/api/users');
      if (resUsers.ok) {
        const uData = await resUsers.json();
        setUsers(uData);
        localStorage.setItem('graocert_users', JSON.stringify(uData));
      }
    } catch (e) {
      console.warn("Utilizando dados de usuários locais (Offline Mode).");
    }

    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) {
        const rData = await resReports.json();
        setReports(rData);
        localStorage.setItem('graocert_reports', JSON.stringify(rData));
      }
    } catch (e) {
      console.warn("Utilizando laudos locais (Offline Mode).");
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncFromRemote();
      pushActivityLog("Sincronização manual completada com sucesso.");
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 800);
    }
  };

  useEffect(() => {
    syncFromRemote();
    const interval = setInterval(syncFromRemote, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveReport = async (newReport: FarmerReport) => {
    const updated = [newReport, ...reports.filter(r => r.id !== newReport.id)];
    setReports(updated);
    setSelectedReportId(newReport.id);
    localStorage.setItem('graocert_reports', JSON.stringify(updated));
    setActiveRightTab('cert');
    setShowInspectModal(true);
    pushActivityLog(`Laudo #${newReport.reportNumber} gerado com sucesso!`);

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
    } catch (e) {
      console.warn("Falha ao salvar remetente offline.");
    }
  };

  const handleDeleteReport = async (id: string) => {
    const filtered = reports.filter(r => r.id !== id);
    setReports(filtered);
    localStorage.setItem('graocert_reports', JSON.stringify(filtered));
    if (selectedReportId === id) {
      setSelectedReportId(filtered.length > 0 ? filtered[0].id : null);
    }
    pushActivityLog(`Laudo deletado com sucesso.`);

    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Falha ao deletar laudo offline.");
    }
  };

  const pushActivityLog = (msg: string) => {
    setActivityLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const handleApproveUser = async (email: string) => {
    const updated = users.map(u => u.email === email ? { ...u, approved: true } : u);
    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));
    pushActivityLog(`Usuário ${email} aprovado com sucesso.`);

    try {
      await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {
      console.warn("Falha ao sincronizar aprovação.");
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === 'edsontome78@gmail.com') {
      alert("Operação proibida: O Administrador principal não pode ser deletado!");
      return;
    }
    const updated = users.filter(u => u.email !== email);
    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));
    pushActivityLog(`Solicitação/Usuário ${email} removido.`);

    try {
      await fetch(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Falha ao deletar usuário.");
    }
  };

  const handleUpdateUserPlan = async (email: string, plan: 'CORRETOR' | 'PRODUTOR') => {
    const updated = users.map(u => u.email === email ? { ...u, plan } : u);
    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));
    pushActivityLog(`Plano do usuário ${email} atualizado para ${plan}.`);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      });
    } catch (e) {
      console.warn("Falha ao sincronizar alteração de plano com o servidor.");
    }
  };

  const handleToggleUserActiveStatus = async (email: string, active: boolean) => {
    if (email === 'edsontome78@gmail.com') {
      alert("Operação proibida: O Administrador principal deve estar sempre ativo!");
      return;
    }
    const updated = users.map(u => {
      if (u.email === email) {
        return { 
          ...u, 
          active, 
          approved: active ? true : u.approved 
        };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));
    pushActivityLog(`Status do usuário ${email} alterado para ${active ? 'Ativo' : 'Inativo'}.`);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, active, approved: active ? true : undefined })
      });
    } catch (e) {
      console.warn("Falha ao sincronizar status do usuário com o servidor.");
    }
  };

  const handleStartEditUser = (user: AppUser) => {
    setEditingUserEmail(user.email);
    setEditUserName(user.name);
    setEditUserEmailField(user.email);
    setEditUserPassword(user.password || '');
    setEditUserPlan(user.plan || 'PRODUTOR');
  };

  const handleSaveUserEdit = async (originalEmail: string) => {
    if (!editUserName.trim() || !editUserEmailField.trim()) {
      alert("Nome e e-mail são obrigatórios.");
      return;
    }

    const emailClean = editUserEmailField.toLowerCase().trim();
    
    // Check if new email is already taken by some OTHER user
    const emailTaken = users.some(u => u.email.toLowerCase() === emailClean && u.email.toLowerCase() !== originalEmail.toLowerCase());
    if (emailTaken) {
      alert("Aviso: Este e-mail já está sendo utilizado por outro usuário.");
      return;
    }

    const updated = users.map(u => {
      if (u.email.toLowerCase() === originalEmail.toLowerCase()) {
        return {
          ...u,
          name: editUserName.trim(),
          email: emailClean,
          password: editUserPassword,
          plan: editUserPlan
        };
      }
      return u;
    });

    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));

    // If the edited user is the current user, update their session too!
    if (currentUser && currentUser.email.toLowerCase() === originalEmail.toLowerCase()) {
      const updatedMe = updated.find(u => u.email.toLowerCase() === emailClean);
      if (updatedMe) {
        setCurrentUser(updatedMe);
        localStorage.setItem('graocert_current_user', JSON.stringify(updatedMe));
      }
    }

    pushActivityLog(`Cadastro de ${originalEmail} editado para ${emailClean}.`);
    setEditingUserEmail(null);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail,
          email: emailClean,
          name: editUserName.trim(),
          password: editUserPassword,
          plan: editUserPlan
        })
      });
    } catch (e) {
      console.warn("Falha ao sincronizar edição com o servidor.");
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const emailClean = loginEmail.toLowerCase().trim();
    if (!emailClean || !loginPassword) {
      setAuthError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (emailClean === 'edsontome78@gmail.com' && loginPassword === '@Scul3d3nado') {
      const adminSess: AppUser = {
        email: 'edsontome78@gmail.com',
        name: 'Edson Tomé',
        approved: true,
        role: 'admin',
        createdAt: '2026-05-24 22:09:07'
      };
      setCurrentUser(adminSess);
      localStorage.setItem('graocert_current_user', JSON.stringify(adminSess));
      pushActivityLog("Administrador Edson Tomé efetuou login.");
      return;
    }

    const matched = users.find(u => u.email === emailClean);
    if (!matched) {
      setAuthError("Usuário ou senha inválidos. Caso seja novo, mude de aba e solicite seu cadastro.");
      return;
    }

    if (matched.password !== loginPassword) {
      setAuthError("Senha incorreta para esta conta.");
      return;
    }

    if (!matched.approved) {
      setAuthError("Acesso bloqueado. Sua solicitação ainda está pendente de aprovação pelo Administrador Edson Tomé.");
      return;
    }

    if (matched.active === false) {
      setAuthError("Acesso bloqueado. Sua conta foi inativada pelo Administrador.");
      return;
    }

    setCurrentUser(matched);
    localStorage.setItem('graocert_current_user', JSON.stringify(matched));
    pushActivityLog(`Técnico ${matched.name} conectado.`);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const nameClean = registerName.trim();
    const emailClean = registerEmail.toLowerCase().trim();
    const passwordClean = registerPassword;

    if (!nameClean || !emailClean || !passwordClean) {
      setAuthError("Preencha todos os campos para a solicitação de cadastro.");
      return;
    }

    if (!acceptTerms) {
      setAuthError("Você deve concordar com os termos de uso antes de prosseguir.");
      return;
    }

    if (users.some(u => u.email === emailClean) || emailClean === 'edsontome78@gmail.com') {
      setAuthError("Este e-mail já está cadastrado ou possui uma solicitação em análise.");
      return;
    }

    const newUser: AppUser = {
      name: nameClean,
      email: emailClean,
      password: passwordClean,
      approved: false,
      role: 'user',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      plan: registerPlan
    };

    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem('graocert_users', JSON.stringify(updated));

    setAuthSuccess("Nossa equipe irá analisar sua solicitação e entrar em contato.");
    pushActivityLog(`Nova solicitação de acesso (${registerPlan}) de ${nameClean} (${emailClean}).`);
    
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setAcceptTerms(false);
    setRegisterPlan('CORRETOR');
    setActiveLoginTab('login');
    setLoginEmail(emailClean);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (err) {
      console.warn("Falha ao registrar usuário no servidor (persistido somente em cache local).", err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('graocert_current_user');
    pushActivityLog("Usuário desconectou do sistema.");
  };

  const activeReport = reports.find(r => r.id === selectedReportId) || null;

  if (!currentUser) {
    return (
      <div 
        id="root-container-auth" 
        className="min-h-screen flex flex-col text-stone-200 justify-between select-none relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${harvestBackground})` }}
      >
        {/* Dark overlay with background blur for rich readability */}
        <div id="auth-bg-overlay" className="absolute inset-0 bg-stone-950/80 backdrop-blur-[4px] z-0"></div>
        
        {/* Simple Top bar */}
        <header className="p-5 border-b border-stone-900/50 max-w-7xl w-full mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold border border-emerald-500">
              🌾
            </div>
            <span className="font-extrabold tracking-widest text-[14px] uppercase text-stone-100 font-sans">Grãocerto Pro</span>
          </div>
          <span className="text-[10px] text-stone-300 font-mono uppercase tracking-widest flex items-center gap-1.5 bg-stone-950/60 px-3 py-1 rounded-full border border-stone-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Acesso Restrito
          </span>
        </header>

        {/* Core Portals Auth Box */}
        <main className="max-w-md w-full mx-auto p-4 flex-1 flex flex-col justify-center relative z-10">
          <div className="bg-stone-900/90 rounded-2xl border border-stone-800/80 p-6 md:p-8 shadow-2xl space-y-6 [backdrop-filter:blur(10px)]">
            
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <h2 className="text-lg font-sans font-black uppercase tracking-wider text-stone-100">Acesso ao Aplicativo</h2>
                <p className="text-[11px] text-stone-400">Classificação de Grãos e Amostragem Portátil de Campo</p>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  id="btn-open-plans"
                  onClick={() => setShowPlansModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 to-stone-950 hover:from-emerald-900 hover:to-stone-900 border border-emerald-800 hover:border-emerald-700 text-emerald-450 font-extrabold text-[11px] uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>Ver Planos Assinatura 💎</span>
                </button>
              </div>
            </div>



            {/* Tab Toggles */}
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-850">
              <button
                type="button"
                onClick={() => {
                  setActiveLoginTab('login');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 text-center py-2 text-xs rounded-lg transition font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLoginTab === 'login'
                    ? 'bg-emerald-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Identificar-se</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLoginTab('register');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 text-center py-2 text-xs rounded-lg transition font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLoginTab === 'register'
                    ? 'bg-emerald-600 text-white'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Solicitar Cadastro</span>
              </button>
            </div>

            {/* Error & Success banner notifications */}
            {authError && (
              <div className="bg-red-950/40 border border-red-900 text-red-300 text-[11px] p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">{authError}</p>
              </div>
            )}

            {authSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-[11px] p-3 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">{authSuccess}</p>
              </div>
            )}

            {/* Form Fields */}
            {activeLoginTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label htmlFor="auth-email-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    E-mail do Operador / Técnico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      placeholder="tecnico@graocert.com.br"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-password-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    Senha Secreta
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 border border-emerald-500 mt-6"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Entrar no Sistema
                </button>

              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label htmlFor="reg-name-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="reg-name-input"
                      type="text"
                      required
                      placeholder="Ex: João da Safra"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg-email-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    Endereço de E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="reg-email-input"
                      type="email"
                      required
                      placeholder="joao@gmail.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg-password-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    Senha para Próximos Acessos
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      id="reg-password-input"
                      type="password"
                      required
                      placeholder="Crie uma senha segura"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg-plan-input" className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                    Escolha seu Plano de Acesso
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <select
                      id="reg-plan-input"
                      required
                      value={registerPlan}
                      onChange={(e) => setRegisterPlan(e.target.value as 'CORRETOR' | 'PRODUTOR')}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans text-stone-200 focus:outline-none focus:border-emerald-600 transition"
                    >
                      <option value="CORRETOR">🌾 Plano Corretor — R$ 500,00 ativação + R$ 150,00/mês</option>
                      <option value="PRODUTOR">🚜 Plano Produtor — Ativação Grátis + R$ 1.000,00/mês</option>
                    </select>
                  </div>
                </div>

                {/* Accept Terms Checkbox */}
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    id="reg-accept-terms"
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-stone-850 bg-stone-950 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-stone-900 focus:ring-2"
                  />
                  <label htmlFor="reg-accept-terms" className="text-[11px] text-stone-300 leading-snug cursor-pointer font-sans select-none">
                    Declaro que li e aceito os termos de licença de uso do sistema Grãocerto Pro.
                  </label>
                </div>

                <p className="text-[9px] text-stone-400 leading-normal italic">
                  * Nota: Contas recém criadas receberão status "Pendente" e deverão ser ativadas pelo Administrador Edson Tomé no Painel ADM.
                </p>

                <button
                  id="btn-submit-register"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 border border-emerald-500 mt-6"
                >
                  <UserPlus className="w-4 h-4" />
                  Solicitar Cadastro
                </button>

              </form>
            )}



          </div>
        </main>

        {/* BOTTOM METADATA FOR VISITOR - REQUESTED */}
        <footer className="p-5 border-t border-stone-900/40 max-w-7xl w-full mx-auto flex justify-between items-center gap-4 text-xs relative z-10">
          <p className="text-[10px] text-stone-400 font-sans uppercase tracking-wider">Estação de Classificação Portátil Off-line</p>
          <button
            onClick={() => setShowAndroidInstallModal(true)}
            className="text-[10px] text-emerald-500 hover:text-emerald-400 font-extrabold flex items-center gap-1.5 uppercase transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalar no Android 📱</span>
          </button>
        </footer>

        {/* Instalação modal */}
        {showAndroidInstallModal && (
          <div id="android-install-overlay" className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                <span className="font-extrabold text-xs tracking-wider text-emerald-400 font-sans">MÉTODOS DE INSTALAÇÃO</span>
                <button onClick={() => setShowAndroidInstallModal(false)} className="text-stone-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                Para rodar o app no seu dispositivo móvel no interior de lavouras e silos sem cobertura de rede, abra no **Google Chrome** no Android, toque no **menu de três pontos** no canto superior direito e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
              </p>
              <button 
                onClick={() => setShowAndroidInstallModal(false)}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Plans modal */}
        {showPlansModal && (
          <div id="plans-modal-overlay" className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 z-50 animate-fade-in backdrop-blur-sm overflow-y-auto">
            <div className="bg-stone-900 border border-stone-850 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-4">
              {/* Header */}
              <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div>
                    <h3 className="font-extrabold text-stone-100 uppercase tracking-wider text-xs font-sans">Planos de Assinatura</h3>
                    <p className="text-[9px] text-stone-450 uppercase font-sans">Opções otimizadas para sua operação</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPlansModal(false)} 
                  className="p-1 px-2.5 rounded bg-stone-850 text-stone-300 hover:bg-stone-800 hover:text-white font-sans text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-900/50">
                {/* Plano Corretor */}
                <div className="bg-stone-950/60 rounded-xl border border-stone-800 hover:border-emerald-800/60 p-4 flex flex-col justify-between space-y-4 transition hover:shadow-xl shadow-black/40">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest font-sans">
                        🌾 Plano Corretor
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-stone-400 text-[9px] uppercase font-bold font-sans">Investimento</div>
                      <div className="text-lg font-bold font-mono text-white leading-tight">
                        R$ 150,00 <span className="text-[10px] text-stone-400 font-normal font-sans">/ mês</span>
                      </div>
                      <div className="text-[10px] text-stone-405 font-mono">
                        + R$ 500,00 Taxa de Ativação
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-350 leading-snug min-h-[36px] font-sans">
                      Ideal para corretores que necessitam de emissão, PDF e impressão térmica de soja e milho.
                    </p>

                    <div className="border-t border-stone-850 pt-3 space-y-1.5">
                      <div className="text-[9px] text-stone-500 uppercase tracking-widest font-extrabold font-sans">Recursos inclusos:</div>
                      <ul className="grid grid-cols-1 gap-1.5">
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>Classificação (Soja e Milho)</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>Impressão Térmica e A4</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>Exportação Excel e PDF</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert("Excelente escolha! Para ativar seu Plano Corretor, entre em contato diretamente com o Administrador Edson Tomé ou envie sua solicitação de cadastro para aprovação imediata.");
                      setShowPlansModal(false);
                    }}
                    className="w-full py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-lg border border-stone-850 transition cursor-pointer font-sans"
                  >
                    Quero o Corretor
                  </button>
                </div>

                {/* Plano Produtor */}
                <div className="bg-gradient-to-b from-stone-950/80 to-stone-950/40 rounded-xl border-2 border-emerald-600 hover:border-emerald-500 p-4 flex flex-col justify-between space-y-4 transition hover:shadow-xl shadow-emerald-950/20 relative">
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-600 text-white rounded text-[8px] font-black uppercase tracking-wider border border-emerald-500 font-sans">
                    RECOMENDADO
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest font-sans">
                        🚜 Plano Produtor
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-stone-300 text-[9px] uppercase font-bold font-sans">Investimento</div>
                      <div className="text-lg font-bold font-mono text-white leading-tight">
                        R$ 1.000,00 <span className="text-[10px] text-stone-350 font-normal font-sans">/ mês</span>
                      </div>
                      <div className="text-[10px] text-emerald-450 font-black font-sans">
                        Ativação 100% Grátis!
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-350 leading-snug min-h-[36px] font-sans">
                      Controle total e robusto de estoque de silos, balança e múltiplas culturas integradas.
                    </p>

                    <div className="border-t border-stone-850 pt-3 space-y-1.5">
                      <div className="text-[9px] text-stone-500 uppercase tracking-widest font-extrabold font-sans">Tudo do Corretor, mais:</div>
                      <ul className="grid grid-cols-1 gap-1.5">
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="font-semibold text-emerald-400">Classificação de Sorgo</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="font-semibold text-emerald-400">Estoque de Silos & Balança</span>
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] text-stone-300 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-stone-200">Entradas e Saídas do Armazém</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert("Excelente escolha! Para ativar seu Plano Produtor e liberar as ferramentas completas de estoque, balança e múltiplas culturas, fale conosco e agende a liberação de sua conta.");
                      setShowPlansModal(false);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] uppercase tracking-widest rounded-lg border border-emerald-500 transition cursor-pointer shadow-lg font-sans"
                  >
                    Quero o Produtor
                  </button>
                </div>
              </div>

              {/* Footer notes */}
              <div className="p-3 bg-stone-950/80 border-t border-stone-800 text-center font-sans text-[10px] text-stone-400 flex flex-wrap justify-center gap-1">
                <span>Dúvidas ou consultoria personalizada?</span>
                <span className="text-emerald-400 font-mono">edsontome78@gmail.com</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="root-container" className="min-h-screen bg-stone-100 flex flex-col text-stone-900 selection:bg-emerald-200">
      
      {/* HEADER NAV STANDARD */}
      <header id="app-header-nav" className="bg-stone-900 text-white border-b border-stone-850 p-4 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
          
          {/* Logo dropdown parent wrapper */}
          <div className="relative">
            <div 
              onClick={() => setShowLogoDropdown(!showLogoDropdown)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 select-none"
              title="Menu do Usuário"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold border border-emerald-500 shadow-sm shadow-emerald-500/20">
                🌾
              </div>
              <div>
                <h1 className="font-extrabold tracking-tight text-sm uppercase text-stone-100 flex items-center gap-1">
                  Grãocerto Pro <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </h1>
                <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  classificação de campo & cupom portátil
                </p>
              </div>
            </div>

            {/* Hidden technical user information & exit option inside custom dropdown */}
            {showLogoDropdown && currentUser && (
              <div className="absolute left-0 mt-2 w-64 bg-stone-800 text-white rounded-xl border border-stone-700 p-3.5 shadow-xl z-50 animate-fade-in font-sans">
                <div className="border-b border-stone-700 pb-2.5 mb-2.5">
                  <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Técnico Autorizado</p>
                  <p className="font-bold text-sm text-stone-100 mt-1">{currentUser.name}</p>
                  <p className="text-xs text-stone-400">{currentUser.email}</p>
                  <p className="text-[10px] text-emerald-400 font-mono mt-1 font-bold uppercase tracking-wider bg-emerald-950/40 px-2 py-0.5 rounded inline-block">
                    {currentUser.role === 'admin' ? 'Administrador' : 'Técnico de Campo'}
                  </p>
                </div>
                <button
                  id="header-btn-logout"
                  onClick={() => {
                    setShowLogoDropdown(false);
                    handleLogout();
                  }}
                  className="w-full bg-stone-700 hover:bg-stone-600 hover:text-red-200 text-stone-200 font-bold py-2 px-3 rounded-lg border border-stone-600 hover:border-red-900/40 flex items-center justify-center gap-1.5 transition text-xs cursor-pointer shadow-sm font-sans"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    id="btn-admin-manage-dialog"
                    onClick={() => {
                      setShowLogoDropdown(false);
                      setShowAdminModal(true);
                    }}
                    className="w-full mt-2 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-lg border border-emerald-600 flex items-center justify-center gap-1.5 transition text-xs cursor-pointer shadow-sm font-sans"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Gerenciar Contas ({users.filter(u => !u.approved).length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upper-right: Single light/dark mode icon for layout optimization */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-full bg-stone-850 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-100 transition cursor-pointer"
              title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-amber-500 animate-pulse" /> : <Sun className="w-4 h-4 text-yellow-500" />}
            </button>
          </div>

        </div>
      </header>

      <main id="main-workspace-content" className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-4 space-y-2">

        {/* TABS SELECTOR (Styled like Facebook or Instagram with clear custom icons and indicators) */}
        <div id="agri-app-tab-navigation" className="bg-white rounded-2xl border border-stone-200 shadow-sm p-1.5 mb-2 sticky top-16 z-30 bg-opacity-95 backdrop-blur-md">
          <div className="grid grid-cols-3 gap-1">
            <button
              id="tab-btn-cultura"
              type="button"
              onClick={() => {
                changeTab('cultura');
                pushActivityLog("Visualizando aba: Cultura Analisada");
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer relative min-h-[48px] ${
                currentTab === 'cultura'
                  ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-sm'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50/50'
              }`}
            >
              <Sprout className={`w-5 h-5 mb-0.5 ${currentTab === 'cultura' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full text-center">Cultura Analisada</span>
              {currentTab === 'cultura' && (
                <div className="absolute bottom-0.5 w-12 h-1 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              id="tab-btn-armazem"
              type="button"
              onClick={() => {
                changeTab('armazem');
                pushActivityLog("Visualizando aba: Saldo Total Armazém");
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer relative min-h-[48px] ${
                currentTab === 'armazem'
                  ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-sm'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50/50'
              }`}
            >
              <Warehouse className={`w-5 h-5 mb-0.5 ${currentTab === 'armazem' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full text-center">Saldo Armazém</span>
              {currentTab === 'armazem' && (
                <div className="absolute bottom-0.5 w-12 h-1 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              id="tab-btn-arquivo"
              type="button"
              onClick={() => {
                changeTab('arquivo');
                pushActivityLog("Visualizando aba: Arquivo Central");
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition cursor-pointer relative min-h-[48px] ${
                currentTab === 'arquivo'
                  ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-sm'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50/50'
              }`}
            >
              <Archive className={`w-5 h-5 mb-0.5 ${currentTab === 'arquivo' ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-bold leading-tight truncate w-full text-center">Arquivo Central</span>
              {currentTab === 'arquivo' && (
                <div className="absolute bottom-0.5 w-12 h-1 bg-emerald-600 rounded-full" />
              )}
            </button>
          </div>
        </div>



        {/* ACTIVE TAB CONTENT WINDOW - DRAG & SWIPE CAROUSEL */}
        <div 
          id="agri-app-tab-contents" 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative overflow-hidden w-full select-none"
        >
          <motion.div 
            animate={{ x: currentTab === 'cultura' ? '0%' : currentTab === 'armazem' ? '-33.3333%' : currentTab === 'arquivo' ? '-66.6666%' : '0%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="flex w-[300%]"
          >
            {/* TAB 1: CULTURA ANALISADA */}
            <div className={`w-1/3 flex-shrink-0 px-1 select-text ${currentTab === 'cultura' ? 'h-auto opacity-100 pointer-events-auto' : 'h-[1px] overflow-hidden opacity-0 pointer-events-none'}`}>
              <ClassifierForm 
                onSaveReport={handleSaveReport} 
                reports={reports} 
                currentUserPlan={currentUser?.role === 'admin' ? 'PRODUTOR' : (currentUser?.plan || 'PRODUTOR')} 
              />
            </div>

            {/* TAB 2: SALDO DO ARMAZÉM */}
            <div className={`w-1/3 flex-shrink-0 px-1 select-text ${currentTab === 'armazem' ? 'h-auto opacity-100 pointer-events-auto' : 'h-[1px] overflow-hidden opacity-0 pointer-events-none'}`}>
              <WarehouseBalance 
                reports={reports} 
                currentUserPlan={currentUser?.role === 'admin' ? 'PRODUTOR' : (currentUser?.plan || 'PRODUTOR')} 
              />
            </div>

            {/* TAB 3: ARQUIVO CENTRAL */}
            <div className={`w-1/3 flex-shrink-0 px-1 select-text ${currentTab === 'arquivo' ? 'h-auto opacity-100 pointer-events-auto' : 'h-[1px] overflow-hidden opacity-0 pointer-events-none'}`}>
              <ReportHistory 
                reports={reports} 
                selectedId={selectedReportId} 
                onSelect={(report) => {
                  setSelectedReportId(report.id);
                  setShowInspectModal(true);
                  pushActivityLog(`Carregado laudo #${report.reportNumber} no inspetor.`);
                }} 
                onDelete={handleDeleteReport}
                onShared={(method) => pushActivityLog(`Laudo compartilhado via: ${method}`)}
              />
            </div>
          </motion.div>

          {/* TAB 4: PAINEL DO INSPETOR */}
          {currentTab === 'inspetor' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-150 pb-4">
                  <div>
                    <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-5 h-5 text-emerald-700" />
                      Painel do Inspetor 🚀
                    </h4>
                    <p className="text-xs text-stone-500">Módulo de visualização e simulação portátil.</p>
                  </div>
                  
                  {activeReport && (
                    <div className="flex bg-stone-100 p-1 rounded-xl gap-1 border border-stone-200 flex-wrap">
                      <button
                        id="btn-tab-view-cert"
                        onClick={() => {
                          setActiveRightTab('cert');
                          pushActivityLog("Visualizando Laudo A4 completo.");
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 font-bold cursor-pointer ${
                          activeRightTab === 'cert'
                            ? 'bg-white text-stone-900 shadow-sm'
                            : 'text-stone-500 hover:text-stone-850'
                        }`}
                      >
                        <FileCheck className="w-4 h-4 text-emerald-800" />
                        Laudo A4
                      </button>
                      <button
                        id="btn-tab-view-printer"
                        onClick={() => {
                          setActiveRightTab('printer');
                          pushActivityLog("Visualizando simulador de impressora.");
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 font-bold cursor-pointer ${
                          activeRightTab === 'printer'
                            ? 'bg-white text-stone-900 shadow-sm'
                            : 'text-stone-500 hover:text-stone-850'
                        }`}
                      >
                        <Printer className="w-4 h-4 text-emerald-800" />
                        Cupom
                      </button>
                      {currentUser?.role === 'admin' && (
                        <button
                          id="btn-tab-view-admin"
                          onClick={() => {
                            setActiveRightTab('admin');
                            pushActivityLog("Acessou painel administrativo de aprovação de contas.");
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 font-extrabold cursor-pointer ${
                            activeRightTab === 'admin'
                              ? 'bg-emerald-900 text-white shadow-sm'
                              : 'text-emerald-700 hover:text-emerald-950'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          ADM ({users.filter(u => !u.approved).length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-view Rendering */}
                <div className="min-h-[400px]">
                  {!activeReport ? (
                    <div className="bg-stone-50/50 rounded-xl border border-dashed border-stone-250 p-8 flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 border border-stone-200">
                        <Eye className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">Nenhum Laudo Selecionado</h5>
                        <p className="text-xs text-stone-500 max-w-sm leading-relaxed mt-1">
                          Selecione um laudo existente na aba <strong>Arquivo Central</strong> ou preencha a aba <strong>Cultura Analisada</strong> para gerar um novo laudo instantâneo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => changeTab('cultura')}
                        className="p-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs uppercase cursor-pointer transition"
                      >
                        Fazer Nova Classificação 🌱
                      </button>
                    </div>
                  ) : (
                    <>
                      {activeRightTab === 'cert' && (
                        <LaudoPreview 
                          report={activeReport} 
                          onShared={(method) => pushActivityLog(`Exportação executada: ${method}`)}
                        />
                      )}
                      {activeRightTab === 'printer' && (
                        <PrinterSimulator 
                          report={activeReport} 
                          onShared={(method) => pushActivityLog(`Impressão térmica via Bluetooth: ${method}`)}
                        />
                      )}
                      {activeRightTab === 'admin' && currentUser?.role === 'admin' && (
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-inner h-full min-h-[400px] overflow-y-auto space-y-4 font-sans text-xs">
                          <div className="flex items-center justify-between gap-2 mb-2 border-b border-stone-200 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-emerald-700 text-white rounded flex items-center justify-center text-xs font-bold">
                                🛡️
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide font-sans">Aprovação de Contas de Campo</h4>
                                <p className="text-[10px] text-stone-500 font-sans">Aprove ou decline solicitações de técnico.</p>
                              </div>
                            </div>
                            
                            <button
                              id="btn-manual-sync-users"
                              onClick={handleManualSync}
                              disabled={isSyncing}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-emerald-800 border border-stone-200 hover:border-emerald-600 rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer disabled:opacity-60"
                              title="Verificar novas solicitações de cadastro"
                            >
                              <RotateCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
                              {isSyncing ? "Verificando..." : "Sincronizar"}
                            </button>
                          </div>

                          {/* Seletor de Filtros / Abas para Gerenciamento Geral */}
                          <div className="space-y-3">
                            {/* Barra de Pesquisa */}
                            <div className="relative">
                              <input
                                type="text"
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                placeholder="🔍 Buscar por nome ou e-mail..."
                                className="w-full px-3 py-1.5 text-[11px] bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600 transition font-sans text-stone-800 placeholder-stone-400"
                              />
                              {userSearchQuery && (
                                <button
                                  onClick={() => setUserSearchQuery('')}
                                  className="absolute right-2 top-1.5 text-[10px] text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer font-bold"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>

                            {/* Abas */}
                            <div className="flex border-b border-stone-200 bg-stone-200/55 p-1 rounded-lg gap-1">
                              <button
                                type="button"
                                onClick={() => setAdminViewTab('all')}
                                className={`flex-1 py-1 px-1 text-[8px] font-bold rounded-md transition cursor-pointer text-center ${
                                  adminViewTab === 'all'
                                    ? 'bg-emerald-800 text-white shadow-xs font-black'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                Todos ({users.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminViewTab('pending')}
                                className={`flex-1 py-1 px-1 text-[8px] font-bold rounded-md transition cursor-pointer text-center ${
                                  adminViewTab === 'pending'
                                    ? 'bg-amber-600 text-white shadow-xs font-black'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                Pendentes ({users.filter(u => !u.approved).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminViewTab('approved')}
                                className={`flex-1 py-1 px-1 text-[8px] font-bold rounded-md transition cursor-pointer text-center ${
                                  adminViewTab === 'approved'
                                    ? 'bg-emerald-700 text-white shadow-xs font-black'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                Aprovados ({users.filter(u => u.approved).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminViewTab('active')}
                                className={`flex-1 py-1 px-1 text-[8px] font-bold rounded-md transition cursor-pointer text-center ${
                                  adminViewTab === 'active'
                                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                Ativos ({users.filter(u => u.approved && u.active !== false).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminViewTab('inactive')}
                                className={`flex-1 py-1 px-1 text-[8px] font-bold rounded-md transition cursor-pointer text-center ${
                                  adminViewTab === 'inactive'
                                    ? 'bg-stone-600 text-white shadow-xs font-black'
                                    : 'text-stone-600 hover:text-stone-900'
                                }`}
                              >
                                Inativos ({users.filter(u => u.approved && u.active === false).length})
                              </button>
                            </div>
                          </div>

                          {/* Lista filtrada de usuários */}
                          <div className="space-y-2 mt-2">
                            {(() => {
                              const filtered = users.filter(user => {
                                // Filter by selected tab
                                if (adminViewTab === 'pending') {
                                  if (user.approved) return false;
                                } else if (adminViewTab === 'active') {
                                  if (!user.approved || user.active === false) return false;
                                } else if (adminViewTab === 'inactive') {
                                  if (!user.approved || user.active !== false) return false;
                                }

                                // Filter by search input query
                                if (userSearchQuery.trim()) {
                                  const query = userSearchQuery.toLowerCase().trim();
                                  const matchName = user.name.toLowerCase().includes(query);
                                  const matchEmail = user.email.toLowerCase().includes(query);
                                  return matchName || matchEmail;
                                }

                                return true;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <p className="text-[11px] text-stone-500 bg-stone-100 p-6 rounded text-center border border-dashed border-stone-200 italic font-sans font-medium">
                                    Nenhum usuário foi encontrado para o filtro aplicado.
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                  {filtered.map((user) => {
                                    const isDeletingNow = userEmailToConfirmDelete === user.email;
                                    const isPending = !user.approved;
                                    const isActive = user.approved && user.active !== false;
                                    const isInactive = user.approved && user.active === false;
                                    const isEditingThisUser = editingUserEmail === user.email;

                                    return (
                                      <div key={user.email} className={`p-3 rounded-lg border flex flex-col gap-2 transition ${isDeletingNow ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-white border-stone-200'} text-[11px]`}>
                                        
                                        {isEditingThisUser ? (
                                          <div className="space-y-2.5 p-1">
                                            <p className="font-extrabold text-[12px] text-emerald-950 uppercase tracking-wide border-b border-stone-200 pb-1 flex items-center gap-1.5">
                                              <span>✏️ Editar Cadastro</span>
                                            </p>
                                            
                                            <div className="space-y-2 text-left">
                                              <div>
                                                <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Nome Completo</label>
                                                <input
                                                  type="text"
                                                  value={editUserName}
                                                  onChange={(e) => setEditUserName(e.target.value)}
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none focus:border-emerald-600 font-bold transition text-stone-850 text-[11px]"
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Endereço de E-mail</label>
                                                <input
                                                  type="email"
                                                  value={editUserEmailField}
                                                  onChange={(e) => setEditUserEmailField(e.target.value)}
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none focus:border-emerald-600 font-bold transition text-stone-850 text-[11px]"
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Senha de Acesso</label>
                                                <input
                                                  type="text"
                                                  value={editUserPassword}
                                                  onChange={(e) => setEditUserPassword(e.target.value)}
                                                  className="w-full px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none focus:border-emerald-600 font-bold transition text-stone-850 text-[11px]"
                                                  placeholder="Senha"
                                                />
                                              </div>

                                              <div className="flex items-center justify-between gap-2 border-t border-stone-150 pt-2 flex-wrap text-left">
                                                <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Tipo de Plano:</span>
                                                <div className="flex bg-stone-100 p-0.5 rounded border border-stone-200">
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditUserPlan('CORRETOR')}
                                                    className={`px-2 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                                      editUserPlan === 'CORRETOR'
                                                        ? 'bg-amber-500 text-white shadow-xs font-black'
                                                        : 'text-stone-500 hover:text-stone-800'
                                                    }`}
                                                  >
                                                    🌾 Corretor
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditUserPlan('PRODUTOR')}
                                                    className={`px-2 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                                      editUserPlan !== 'CORRETOR'
                                                        ? 'bg-emerald-700 text-white shadow-xs font-black'
                                                        : 'text-stone-500 hover:text-stone-800'
                                                    }`}
                                                  >
                                                    🚜 Produtor
                                                  </button>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex gap-2 justify-end pt-2 border-t border-stone-150 mt-1">
                                              <button
                                                type="button"
                                                onClick={() => setEditingUserEmail(null)}
                                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded-lg transition text-[10px] cursor-pointer"
                                              >
                                                Cancelar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleSaveUserEdit(user.email)}
                                                className="px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-lg transition text-[10px] shadow-sm cursor-pointer"
                                              >
                                                Salvar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex justify-between items-start gap-2">
                                              <div className="truncate flex-1 mr-2 text-left">
                                                <p className="font-extrabold text-stone-900 truncate font-sans flex items-center gap-1.5 flex-wrap">
                                                  {user.name} 
                                                  {user.role === 'admin' ? (
                                                    <span className="bg-emerald-900 text-emerald-100 text-[8px] font-black px-1.5 rounded uppercase font-sans tracking-wide">ADM MASTER</span>
                                                  ) : (
                                                    <>
                                                      <span className={`text-[8px] font-extrabold px-1.5 rounded ${
                                                        user.plan === 'CORRETOR' 
                                                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                          : 'bg-emerald-150 text-emerald-850 border border-emerald-250'
                                                      }`}>
                                                        {user.plan === 'CORRETOR' ? '🌾 PL. CORRETOR' : '🚜 PL. PRODUTOR'}
                                                      </span>

                                                      <span className={`text-[8px] font-extrabold px-1.5 rounded ${
                                                        isPending 
                                                          ? 'bg-orange-100 text-orange-850 border border-orange-200 animate-pulse' 
                                                          : isActive
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                                                            : 'bg-stone-200 text-stone-700 border border-stone-300'
                                                      }`}>
                                                        {isPending ? 'PENDENTE' : isActive ? 'ATIVO' : 'INATIVO'}
                                                      </span>
                                                    </>
                                                  )}
                                                </p>
                                                <p className="text-[10px] text-stone-500 font-mono truncate">{user.email}</p>
                                                <p className="text-[9px] text-stone-400 font-sans font-semibold">⏰ Cadastro: {user.createdAt || 'N/A'}</p>
                                              </div>

                                              {user.role !== 'admin' && !isDeletingNow && (
                                                <div className="flex gap-1.5 flex-shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleStartEditUser(user)}
                                                    className="text-[10px] text-emerald-850 hover:text-emerald-950 font-bold hover:bg-stone-100 px-2 py-1 rounded transition font-sans cursor-pointer border border-stone-200"
                                                    title="Editar este cadastro"
                                                  >
                                                    Editar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setUserEmailToConfirmDelete(user.email)}
                                                    className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition font-bold font-sans cursor-pointer border border-red-100"
                                                    title="Excluir cadastro permanentemente"
                                                  >
                                                    Excluir
                                                  </button>
                                                </div>
                                              )}
                                            </div>

                                            {user.role !== 'admin' && !isDeletingNow && (
                                              <div className="space-y-2 mt-1 border-t border-stone-100 pt-2 text-left">
                                                {/* Plan switcher */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider font-sans">Alterar Plano:</span>
                                                  <div className="flex bg-stone-100 p-0.5 rounded-md gap-0.5 border border-stone-200">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleUpdateUserPlan(user.email, 'CORRETOR')}
                                                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                                        user.plan === 'CORRETOR'
                                                          ? 'bg-amber-500 text-white shadow-xs font-black'
                                                          : 'text-stone-500 hover:text-stone-800'
                                                      }`}
                                                    >
                                                      🌾 Corretor
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleUpdateUserPlan(user.email, 'PRODUTOR')}
                                                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                                        user.plan !== 'CORRETOR'
                                                          ? 'bg-emerald-700 text-white shadow-xs font-black'
                                                          : 'text-stone-500 hover:text-stone-800'
                                                      }`}
                                                    >
                                                      🚜 Produtor
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Status Switcher */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider font-sans">Status Acesso:</span>
                                                  <div className="flex gap-1">
                                                    {isPending && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleApproveUser(user.email)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold py-1 px-2 rounded transition cursor-pointer font-sans"
                                                      >
                                                        Aprovar / Ativar
                                                      </button>
                                                    )}
                                                    {isActive && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleToggleUserActiveStatus(user.email, false)}
                                                        className="bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3] text-[9px] font-bold py-1 px-2 rounded transition cursor-pointer font-sans"
                                                        title="Inativar este usuário para bloquear o login"
                                                      >
                                                        🚫 Inativar Acesso
                                                      </button>
                                                    )}
                                                    {isInactive && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleToggleUserActiveStatus(user.email, true)}
                                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold py-1 px-2 rounded transition cursor-pointer font-sans"
                                                        title="Ativar usuário e reestabelecer acesso"
                                                      >
                                                        ✅ Reativar Acesso
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {isDeletingNow && (
                                              <div className="bg-white p-2 rounded border border-red-200 mt-1 space-y-2 text-left">
                                                <p className="text-[10px] text-red-850 font-semibold font-sans">
                                                  Deseja mesmo <strong>excluir permanentemente</strong> esta conta?
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                  <button
                                                    type="button"
                                                    onClick={() => setUserEmailToConfirmDelete(null)}
                                                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded transition text-[9px] cursor-pointer"
                                                  >
                                                    Cancelar
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      handleDeleteUser(user.email);
                                                      setUserEmailToConfirmDelete(null);
                                                    }}
                                                    className="px-3 py-1 bg-red-650 hover:bg-red-750 text-white font-black rounded transition text-[9px] shadow-sm cursor-pointer"
                                                  >
                                                    Confirmar Exclusão
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* MODAL - INSPECIONAR LAUDO E EMITIR CUPOM */}
      {showInspectModal && activeReport && (
        <div id="inspector-modal-overlay" className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col font-sans text-stone-900">
            <div className="bg-stone-900 text-white p-4 flex justify-between items-center border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                  🌾
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Laudo #{String(activeReport.reportNumber).padStart(5, '0')} - {GRAIN_PRESETS[activeReport.sample?.grainType || 'SOJA']?.name || 'SOJA'}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-mono">Visualizador Técnico Portátil</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-stone-800 p-1 rounded-xl gap-1 border border-stone-700">
                  <button
                    id="modal-btn-tab-view-cert"
                    onClick={() => {
                      setActiveRightTab('cert');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 font-bold cursor-pointer ${
                      activeRightTab === 'cert'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-800" />
                    Laudo A4
                  </button>
                  <button
                    id="modal-btn-tab-view-printer"
                    onClick={() => {
                      setActiveRightTab('printer');
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 font-bold cursor-pointer ${
                      activeRightTab === 'printer'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-800" />
                    Cupom Térmico
                  </button>
                </div>

                <button
                  onClick={() => setShowInspectModal(false)}
                  className="p-1 px-3 text-xs font-bold rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-100">
              {activeRightTab === 'cert' && (
                <LaudoPreview 
                  report={activeReport} 
                  onShared={(method) => pushActivityLog(`Exportação executada: ${method}`)}
                />
              )}
              {activeRightTab === 'printer' && (
                <PrinterSimulator 
                  report={activeReport} 
                  onShared={(method) => pushActivityLog(`Impressão térmica via Bluetooth: ${method}`)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL - GERENCIAR CONTAS DE TÉCNICOS DE CAMPO */}
      {showAdminModal && currentUser?.role === 'admin' && (
        <div id="admin-modal-overlay" className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col font-sans text-stone-900">
            <div className="bg-stone-900 text-white p-4 flex justify-between items-center border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Aprovação de Contas de Campo</h4>
                  <p className="text-[10px] text-stone-400 font-mono">Gerenciador Master de Acessos</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-3 py-1 bg-stone-850 hover:bg-stone-800 font-bold text-xs rounded-lg text-stone-400 hover:text-white border border-stone-800 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50 text-xs">
              {/* Sync check */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
                <span className="font-bold text-stone-700">Ações Administrativas</span>
                <button
                  id="btn-manual-sync-users"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-emerald-850 border border-stone-200 rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? "Verificando..." : "Sincronizar Cadastros"}
                </button>
              </div>

              {/* Seletor de Filtros / Abas para Gerenciamento Geral no Modal */}
              <div className="space-y-3 pb-2 text-left">
                {/* Barra de Pesquisa */}
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="🔍 Buscar por nome ou e-mail..."
                    className="w-full px-3 py-2 text-[11px] bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600 transition font-sans text-stone-800 placeholder-stone-400 font-bold"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[10px] text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Abas */}
                <div className="flex border border-stone-200 bg-stone-100 p-0.5 rounded-lg gap-0.5">
                  <button
                    type="button"
                    onClick={() => setAdminViewTab('all')}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition cursor-pointer text-center ${
                      adminViewTab === 'all'
                        ? 'bg-emerald-800 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900 shadow-none'
                    }`}
                  >
                    Todos ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewTab('pending')}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition cursor-pointer text-center ${
                      adminViewTab === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900 shadow-none'
                    }`}
                  >
                    Pendentes ({users.filter(u => !u.approved).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewTab('active')}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition cursor-pointer text-center ${
                      adminViewTab === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900 shadow-none'
                    }`}
                  >
                    Ativos ({users.filter(u => u.approved && u.active !== false).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewTab('inactive')}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition cursor-pointer text-center ${
                      adminViewTab === 'inactive'
                        ? 'bg-stone-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900 shadow-none'
                    }`}
                  >
                    Inativos ({users.filter(u => u.approved && u.active === false).length})
                  </button>
                </div>
              </div>

              {/* Lista de Usuários no Modal */}
              <div className="space-y-3 font-sans max-h-[380px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = users.filter(user => {
                    // Filter by selected tab
                    if (adminViewTab === 'pending') {
                      if (user.approved) return false;
                    } else if (adminViewTab === 'active') {
                      if (!user.approved || user.active === false) return false;
                    } else if (adminViewTab === 'inactive') {
                      if (!user.approved || user.active !== false) return false;
                    }

                    // Filter by search input query
                    if (userSearchQuery.trim()) {
                      const query = userSearchQuery.toLowerCase().trim();
                      const matchName = user.name.toLowerCase().includes(query);
                      const matchEmail = user.email.toLowerCase().includes(query);
                      return matchName || matchEmail;
                    }

                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-[11px] text-stone-500 bg-white p-8 rounded-xl text-center border border-dashed border-stone-200 italic font-sans font-medium">
                        Nenhum técnico de campo encontrado para os critérios selecionados.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filtered.map((user) => {
                        const isDeletingNow = userEmailToConfirmDelete === user.email;
                        const isPending = !user.approved;
                        const isActive = user.approved && user.active !== false;
                        const isInactive = user.approved && user.active === false;

                        return (
                          <div key={user.email} className={`p-4 rounded-xl border flex flex-col gap-3 transition text-left ${isDeletingNow ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-white border-stone-200'} text-[11px] shadow-xs`}>
                            <div className="flex justify-between items-start gap-2 text-left">
                              <div className="truncate flex-1 text-left">
                                <p className="font-extrabold text-stone-900 text-xs truncate font-sans flex items-center gap-2 flex-wrap justify-start">
                                  <span>{user.name}</span>
                                  {user.role === 'admin' ? (
                                    <span className="bg-emerald-900 text-emerald-100 text-[8px] font-black px-1.5 rounded uppercase font-sans tracking-wide">ADM MASTER</span>
                                  ) : (
                                    <>
                                      <span className={`text-[8px] font-extrabold px-1.5 rounded ${
                                        user.plan === 'CORRETOR' 
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}>
                                        {user.plan === 'CORRETOR' ? '🌾 PL. CORRETOR' : '🚜 PL. PRODUTOR'}
                                      </span>

                                      <span className={`text-[8px] font-extrabold px-1.5 rounded ${
                                        isPending 
                                          ? 'bg-orange-100 text-orange-850 border border-orange-200 animate-pulse' 
                                          : isActive
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                                            : 'bg-stone-200 text-stone-700 border border-stone-300'
                                      }`}>
                                        {isPending ? 'PENDENTE' : isActive ? 'ATIVO' : 'INATIVO'}
                                      </span>
                                    </>
                                  )}
                                </p>
                                <p className="text-[10px] text-stone-550 font-mono truncate mt-0.5 text-left">{user.email}</p>
                                <p className="text-[9px] text-stone-400 font-sans font-semibold mt-0.5 text-left">Criado em: {user.createdAt || 'N/A'}</p>
                              </div>

                              {user.role !== 'admin' && !isDeletingNow && (
                                <button
                                  type="button"
                                  onClick={() => setUserEmailToConfirmDelete(user.email)}
                                  className="text-[10px] text-red-500 hover:text-red-700 font-extrabold font-sans cursor-pointer flex-shrink-0 bg-transparent border-none p-0"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>

                            {user.role !== 'admin' && !isDeletingNow && (
                              <div className="space-y-2.5 mt-1 border-t border-stone-100 pt-3">
                                {/* Plan Options */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider font-sans">Tipo de Plano:</span>
                                  <div className="flex bg-stone-100 p-0.5 rounded-md gap-0.5 border border-stone-200 text-left">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateUserPlan(user.email, 'CORRETOR')}
                                      className={`px-2 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                        user.plan === 'CORRETOR'
                                          ? 'bg-amber-500 text-white shadow-xs font-black'
                                          : 'text-stone-500 hover:text-stone-800'
                                      }`}
                                    >
                                      🌾 Corretor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateUserPlan(user.email, 'PRODUTOR')}
                                      className={`px-2 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                                        user.plan !== 'CORRETOR'
                                          ? 'bg-emerald-700 text-white shadow-xs font-black'
                                          : 'text-stone-500 hover:text-stone-800'
                                      }`}
                                    >
                                      🚜 Produtor
                                    </button>
                                  </div>
                                </div>

                                {/* Access Status */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider font-sans">Alterar Status:</span>
                                  <div className="flex gap-1.5">
                                    {isPending && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveUser(user.email)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold py-1 px-3 rounded-lg transition shadow-xs cursor-pointer font-sans"
                                      >
                                        Aprovar & Ativar
                                      </button>
                                    )}
                                    {isActive && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserActiveStatus(user.email, false)}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-805 border border-amber-300 text-[9px] font-bold py-1 px-2.5 rounded-lg transition cursor-pointer font-sans"
                                        title="Inativar este usuário para bloquear o login"
                                      >
                                        Inativar Acesso
                                      </button>
                                    )}
                                    {isInactive && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserActiveStatus(user.email, true)}
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[9px] font-bold py-1 px-2.5 rounded-lg transition cursor-pointer font-sans"
                                        title="Ativar usuário e reestabelecer acesso"
                                      >
                                        Reativar Acesso
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {isDeletingNow && (
                              <div className="bg-white p-2 text-left rounded border border-red-200 mt-1 space-y-2">
                                <p className="text-[10px] text-red-800 font-semibold font-sans text-left">
                                  Confirma exclusão permanente da conta?
                                </p>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setUserEmailToConfirmDelete(null)}
                                    className="px-2.5 py-1 bg-stone-100 text-stone-700 font-bold rounded transition text-[9px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteUser(user.email);
                                      setUserEmailToConfirmDelete(null);
                                    }}
                                    className="px-3 py-1 bg-red-650 hover:bg-red-750 text-white font-black rounded transition text-[9px] cursor-pointer shadow-sm"
                                  >
                                    Confirmar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT WORKSPACE FOOTER */}
      <footer className="bg-stone-950 text-stone-500 border-t border-stone-900 p-4 text-xs print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 GRÃOCERTO PRO. Todos os direitos reservados. Licenciado para operação offline.</p>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-stone-300">Termos de Uso</span>
            <span className="cursor-pointer hover:text-stone-300">Suporte Técnico Agro</span>
          </div>
        </div>
      </footer>

      {/* ANDROID INSTALL MODAL (PWA) */}
      {showAndroidInstallModal && (
        <div id="android-install-overlay" className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm print:hidden">
          <div 
            id="android-install-card"
            className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 transform scale-100"
          >
            {/* Modal Header */}
            <div className="bg-emerald-900/60 border-b border-stone-800 p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="text-xl bg-emerald-800 text-white p-1.5 rounded-lg border border-emerald-500">
                  📱
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm uppercase tracking-wider text-emerald-100">Instalar Grãocerto Pro no Android</h3>
                  <p className="text-[10px] text-emerald-400 font-mono">OPERAÇÃO DE CAMPO OFF-LINE CONTINUA</p>
                </div>
              </div>
              <button
                id="btn-close-install-modal"
                onClick={() => setShowAndroidInstallModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 font-sans leading-relaxed">
              
              {/* Context text */}
              <p className="text-xs text-stone-300">
                Instalar o aplicativo permite que você o execute em **modo de tela cheia**, tenha uma inicialização **ultra-rápida** e utilize-o **totalmente off-line** no meio da lavoura ou do armazém, mesmo sem sinal de rede para celulares.
              </p>

              {/* Dynamic Instant Prompt (if available) */}
              <div className="bg-emerald-950/40 border border-emerald-850 p-4 rounded-xl text-center space-y-3">
                <div className="flex items-center gap-2 justify-center text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>MÉTODO 1: INSTALAÇÃO RÁPIDA</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  {isInstallable 
                    ? "Seu celular Android foi identificado como totalmente compatível para instalação direta!" 
                    : "Toque abaixo para verificar a compatibilidade e instalar diretamente em seu smartphone."}
                </p>
                <button
                  id="btn-trigger-pwa-prompt"
                  onClick={() => {
                    handleInstallClick();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isInstallable ? "Instalar Grãocerto Pro Agora!" : "Solicitar Instalação"}
                </button>
              </div>

              {/* Manual Standard Steps (Fallback/Robust instruction guide) */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-800 pb-1">
                  MÉTODO 2: INSTALAÇÃO MANUAL (GOOGLE CHROME OU SAMSUNG INTERNET)
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-[10px] font-mono font-bold text-stone-300 flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-stone-300">
                      Abra o site/link do aplicativo no navegador **Google Chrome** no seu celular Android.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-[10px] font-mono font-bold text-stone-300 flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-stone-300">
                      Toque no **menu das três bolinhas verticais** localizadas no canto superior direito do navegador.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-[10px] font-mono font-bold text-stone-300 flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-stone-300">
                      Selecione a opção **"Instalar aplicativo"** ou **"Adicionar à Tela Inicial"**.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-stone-800 border border-stone-750 flex items-center justify-center text-[10px] font-mono font-bold text-stone-300 flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <p className="text-stone-300">
                      Confirme em **Adicionar** ou **Instalar**. Pronto! O ícone com a espiga de milho/soja aparecerá na sua gaveta de aplicativos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Offline highlight badge */}
              <div className="bg-stone-850 p-3 rounded-xl border border-stone-800 text-[10px] text-stone-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>
                  **Observação Técnica:** O aplicativo continuará funcionando nas fazendas sem internet, sincronizando e salvando localmente em seu aparelho de forma 100% segura.
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-950/60 border-t border-stone-800 flex justify-end">
              <button
                id="btn-close-install-modal-footer"
                onClick={() => setShowAndroidInstallModal(false)}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-4 py-2 rounded-xl text-xs transition font-semibold cursor-pointer"
              >
                Voltar ao App
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
