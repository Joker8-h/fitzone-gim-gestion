import React, { useState, useEffect, useCallback } from 'react';
import { api, setAuthToken } from './services/api';
import type {
  TabId,
  Client,
  MembershipPlan,
  GymClass,
  GymEvent,
  Employee,
  EquipmentItem,
  AttendanceRecord,
  FinancialCategory,
  FinancialTransaction,
  FinanceSummary,
  DashboardMetrics,
  TrackingRule,
  TrackingCandidate,
  CommunicationLog,
  AuditLog,
  SystemUser,
} from './types/api';

import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementModal } from './components/modals/UserManagementModal';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Toast } from './components/layout/Toast';

import { DashboardView } from './views/DashboardView';
import {
  ClientsView,
  MembershipsView,
  ClassesView,
  AttendanceView,
} from './views/OperationalViews';
import {
  FinancesView,
  EmployeesView,
  EquipmentView,
  ReportsView,
  WhatsAppAiView,
} from './views/AdminAndAiViews';

import {
  ClientModal,
  QuickRenewModal,
  PlanModal,
  ClassModal,
  EventModal,
  EmployeeModal,
  EquipmentModal,
} from './components/modals/Modals';

export const App: React.FC = () => {
  // Autenticación y Usuarios del Sistema
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  // Datos sincronizados con el Backend SQLite
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // WhatsApp & IA
  const [waStatus, setWaStatus] = useState<{
    status: string;
    qrDataUrl: string | null;
    connectedPhone: string | null;
  }>({ status: 'DISCONNECTED', qrDataUrl: null, connectedPhone: null });
  const [trackingRules, setTrackingRules] = useState<TrackingRule[]>([]);
  const [trackingCandidates, setTrackingCandidates] = useState<TrackingCandidate[]>([]);
  const [waLogs, setWaLogs] = useState<CommunicationLog[]>([]);

  // Estados de Modales
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [quickRenewClient, setQuickRenewClient] = useState<Client | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; isError: boolean } | null>(null);

  const notify = useCallback((msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3800);
  }, []);

  // Carga integral de datos
  const refreshAllData = useCallback(async () => {
    try {
      const [
        m,
        cl,
        pl,
        cls,
        evs,
        emps,
        eqs,
        atts,
        finSum,
        finTxs,
        finCats,
        audits,
        sysUsers,
      ] = await Promise.all([
        api.getDashboardMetrics(),
        api.getClients(),
        api.getPlans(),
        api.getClasses(),
        api.getEvents(),
        api.getEmployees(),
        api.getEquipment(),
        api.getAttendances(),
        api.getFinanceSummary(),
        api.getFinanceTransactions(),
        api.getFinanceCategories(),
        api.getAuditLogs(),
        api.getUsers(),
      ]);

      setMetrics(m);
      setClients(cl);
      setPlans(pl);
      setClasses(cls);
      setEvents(evs);
      setEmployees(emps);
      setEquipment(eqs);
      setAttendances(atts);
      setFinanceSummary(finSum);
      setTransactions(finTxs);
      setCategories(finCats);
      setAuditLogs(audits);
      setSystemUsers(sysUsers);
    } catch (err: any) {
      console.error('Error refrescando datos:', err);
    }
  }, []);

  const refreshWhatsAppData = useCallback(async () => {
    try {
      const [st, rules, cands, logs] = await Promise.all([
        api.getWhatsAppStatus(),
        api.getTrackingRules(),
        api.getTrackingCandidates(),
        api.getWhatsAppLogs(),
      ]);
      setWaStatus(st);
      setTrackingRules(rules);
      setTrackingCandidates(cands);
      setWaLogs(logs);
    } catch (err) {
      console.error('Error cargando WhatsApp IA:', err);
    }
  }, []);

  // Verificar si ya hay cookie de sesión activa al cargar la app
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setCurrentUser(res.user);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
      refreshWhatsAppData();
    }
  }, [currentUser, refreshAllData, refreshWhatsAppData]);

  // Handlers de Autenticación y Usuarios
  const handleLogin = async (username: string, password: string) => {
    setLoginError(null);
    try {
      // La sesión viaja en cookie HttpOnly; no hay token que guardar en el cliente
      const res = await api.login(username, password);
      setCurrentUser(res.user);
      notify(`Sesión iniciada: ${res.user.name}`);
    } catch (err: any) {
      setLoginError(err.message || 'Credenciales inválidas');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (_) {}
    setAuthToken(null);
    setCurrentUser(null);
    notify('Sesión cerrada correctamente');
  };

  const handleCreateSystemUser = async (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => {
    try {
      await api.createUser(payload);
      notify(`Usuario "${payload.email}" creado correctamente`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteSystemUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      notify('Usuario eliminado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // Handlers de Miembros (DP-001)
  const handleSaveClient = async (data: {
    id?: string;
    documentId: string;
    fullName: string;
    phone: string;
    notes?: string;
    status?: 'ACTIVO' | 'INACTIVO';
  }) => {
    try {
      if (data.id) {
        await api.updateClient(data.id, {
          fullName: data.fullName,
          phone: data.phone,
          notes: data.notes,
          status: data.status,
        });
        notify(`Miembro ${data.fullName} actualizado correctamente`);
      } else {
        await api.createClient({
          documentId: data.documentId,
          fullName: data.fullName,
          phone: data.phone,
          notes: data.notes,
        });
        notify(`Miembro ${data.fullName} registrado correctamente`);
      }
      setClientModalOpen(false);
      setEditingClient(null);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message || 'Error al guardar miembro', true);
    }
  };

  const handleToggleClientStatus = async (c: Client) => {
    try {
      const nextStatus = c.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await api.updateClient(c.id, { status: nextStatus });
      notify(`Estado de ${c.full_name} cambiado a ${nextStatus}`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteClient = async (c: Client) => {
    try {
      await api.deleteClient(c.id);
      notify(`Miembro ${c.full_name} eliminado del sistema`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // Handler de Renovación / Asignación de Membresía (DP-002)
  const handleAssignMembership = async (payload: {
    clientId: string;
    planId: string;
    paymentMethod: string;
    pricePaid: number;
    reference?: string;
  }) => {
    try {
      const res = await api.assignMembership(payload);
      setQuickRenewClient(null);
      notify(`Membresía activa hasta ${res.membership.end_date}. Pago registrado en Finanzas.`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message || 'Error al asignar membresía', true);
    }
  };

  // Handler de Check-in con validación estricta (DP-003)
  const handleCheckInAttempt = async (
    client: Client,
    override = false,
    overrideReason?: string
  ): Promise<{ ok: boolean; status?: number; message: string }> => {
    try {
      await api.checkIn({ clientId: client.id, override, overrideReason });
      notify(
        override
          ? `Ingreso excepcional auditado para ${client.full_name}`
          : `Entrada registrada para ${client.full_name}`
      );
      await refreshAllData();
      return { ok: true, message: 'Entrada registrada' };
    } catch (err: any) {
      return {
        ok: false,
        status: err.status,
        message: err.message || 'Membresía vencida o inexistente',
      };
    }
  };

  const handleQuickCheckInFromTable = async (client: Client) => {
    const res = await handleCheckInAttempt(client, false);
    if (!res.ok) {
      if (res.status === 409) {
        notify(res.message, false);
        return;
      }
      const confirmAction = window.confirm(
        `ACCESO BLOQUEADO (${client.full_name}):\n${res.message}\n\n¿Deseas abrir la ventana de renovación inmediata?\n(Pulsa Cancelar si prefieres autorizar ingreso excepcional auditado).`
      );
      if (confirmAction) {
        setQuickRenewClient(client);
      } else {
        const allowException = window.confirm(
          `¿Confirmas autorizar el ingreso excepcional de ${client.full_name}? Quedará registrado en la bitácora de auditoría.`
        );
        if (allowException) {
          await handleCheckInAttempt(client, true, 'Autorizado desde tabla de miembros');
        }
      }
    }
  };

  // Handlers de Planes, Clases, Eventos, Empleados y Equipos
  const handleCreatePlan = async (data: {
    name: string;
    durationDays: number;
    price: number;
    description?: string;
  }) => {
    try {
      await api.createPlan(data);
      setPlanModalOpen(false);
      notify(`Plan "${data.name}" creado correctamente`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await api.deletePlan(id);
      notify('Plan de membresía eliminado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleCreateClass = async (data: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    capacity: number;
    colorTheme: string;
  }) => {
    try {
      await api.createClass(data);
      setClassModalOpen(false);
      notify(`Clase "${data.name}" programada correctamente`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleAdjustClassQuota = async (id: string, delta: number) => {
    try {
      const updated = await api.updateClassEnrollment(id, delta);
      notify(`Cupo de ${updated.name}: ${updated.enrolled_count}/${updated.capacity}`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await api.deleteClass(id);
      notify('Clase eliminada del horario');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleCreateEvent = async (data: {
    title: string;
    dayNum: string;
    monthShort: string;
    timeRange: string;
  }) => {
    try {
      await api.createEvent(data);
      setEventModalOpen(false);
      notify(`Evento "${data.title}" publicado`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteEvent(id);
      notify('Evento eliminado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleCreateEmployee = async (data: {
    fullName: string;
    role: string;
    specialty: string;
    phone: string;
    salary: number;
  }) => {
    try {
      await api.createEmployee(data);
      setEmployeeModalOpen(false);
      notify(`Empleado ${data.fullName} registrado`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleToggleEmployee = async (id: string) => {
    try {
      await api.toggleEmployeeStatus(id);
      notify('Estado del empleado actualizado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handlePayEmployeeSalary = async (emp: Employee) => {
    const trainerCat =
      categories.find((c) => c.type === 'EGRESO' && c.name.toLowerCase().includes('entrenador')) ||
      categories.find((c) => c.type === 'EGRESO');
    if (!trainerCat) return;

    try {
      await api.createFinanceTransaction({
        type: 'EGRESO',
        categoryId: trainerCat.id,
        concept: `Pago de Nómina / Honorarios: ${emp.full_name} (${emp.role})`,
        amount: emp.salary || 1500000,
      });
      notify(`Pago de nómina registrado en Finanzas para ${emp.full_name}`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await api.deleteEmployee(id);
      notify('Empleado eliminado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleCreateEquipment = async (data: { name: string; category: string; status: string }) => {
    try {
      await api.createEquipment(data);
      setEquipmentModalOpen(false);
      notify(`Equipo "${data.name}" agregado al inventario`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleCycleEquipmentStatus = async (id: string, currentStatus: string) => {
    try {
      const order = ['Disponible', 'En uso', 'Mantenimiento'];
      const next = order[(order.indexOf(currentStatus) + 1) % order.length];
      await api.updateEquipmentStatus(id, next);
      notify(`Estado de máquina cambiado a: ${next}`);
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await api.deleteEquipment(id);
      notify('Equipo retirado del inventario');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // Finanzas
  const handleCreateFinanceTx = async (payload: {
    type: 'INGRESO' | 'EGRESO';
    categoryId: string;
    concept: string;
    amount: number;
  }) => {
    try {
      await api.createFinanceTransaction(payload);
      notify('Movimiento financiero registrado en caja');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDeleteFinanceTx = async (id: string) => {
    try {
      await api.deleteFinanceTransaction(id);
      notify('Movimiento financiero eliminado');
      await refreshAllData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  // WhatsApp & IA
  const handleConnectWa = async () => {
    try {
      await api.connectWhatsApp();
      notify('Generando sesión QR de WhatsApp...');
      setTimeout(refreshWhatsAppData, 1200);
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDisconnectWa = async () => {
    try {
      await api.disconnectWhatsApp();
      notify('Sesión de WhatsApp cerrada');
      await refreshWhatsAppData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleRunAutomatedSweep = async () => {
    try {
      const res = await api.runAutomatedWhatsAppSweep();
      notify(`Barrido IA completado: ${res.processedCount} mensajes procesados`);
      await refreshWhatsAppData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleSendSingleCandidate = async (cand: TrackingCandidate) => {
    try {
      await api.sendWhatsAppMessage({
        clientId: cand.clientId,
        ruleType: cand.reason,
        message: cand.suggestedMessage,
      });
      notify(`Recordatorio IA enviado a ${cand.fullName}`);
      await refreshWhatsAppData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleUpdateRule = async (
    ruleType: string,
    data: { thresholdDays: number; isEnabled: boolean; messageTemplate: string }
  ) => {
    try {
      await api.updateTrackingRule(ruleType, data);
      notify('Regla de seguimiento IA actualizada');
      await refreshWhatsAppData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  if (authChecking) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontWeight: 700,
        }}
      >
        Cargando FITZONE...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} errorMessage={loginError} />
        <Toast
          message={toast?.msg || null}
          isError={toast?.isError}
          onClose={() => setToast(null)}
        />
      </>
    );
  }

  const expiringCount = metrics?.memberships?.porVencer || 0;
  const expiredCount = metrics?.memberships?.vencida || 0;
  const totalAlerts = expiringCount + expiredCount + trackingCandidates.length;

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="main-area">
        <Topbar
          currentUser={currentUser}
          globalSearch={globalSearch}
          onGlobalSearchChange={(val) => setGlobalSearch(val)}
          alertCount={totalAlerts}
          expiringCount={expiringCount}
          expiredCount={expiredCount}
          onNavigate={setActiveTab}
          onOpenNewClient={() => {
            setEditingClient(null);
            setClientModalOpen(true);
          }}
          onOpenUserModal={() => setUserModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="content-scroll">
          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              clients={clients}
              externalSearch={globalSearch}
              onNavigate={setActiveTab}
              onOpenNewClient={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              onOpenEditClient={(c) => {
                setEditingClient(c);
                setClientModalOpen(true);
              }}
              onOpenQuickRenew={(c) => setQuickRenewClient(c)}
              onQuickCheckIn={handleQuickCheckInFromTable}
              onCycleEquipment={handleCycleEquipmentStatus}
              onAdjustClassQuota={handleAdjustClassQuota}
              onOpenClassModal={() => setClassModalOpen(true)}
              onOpenEventModal={() => setEventModalOpen(true)}
              onOpenEquipmentModal={() => setEquipmentModalOpen(true)}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              onOpenNew={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              onOpenEdit={(c) => {
                setEditingClient(c);
                setClientModalOpen(true);
              }}
              onOpenRenew={(c) => setQuickRenewClient(c)}
              onQuickCheckIn={handleQuickCheckInFromTable}
              onToggleStatus={handleToggleClientStatus}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === 'memberships' && (
            <MembershipsView
              plans={plans}
              clients={clients}
              onOpenPlanModal={() => setPlanModalOpen(true)}
              onOpenNewClient={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              onDeletePlan={handleDeletePlan}
              onAssignMembership={handleAssignMembership}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesView
              classes={classes}
              events={events}
              onOpenClassModal={() => setClassModalOpen(true)}
              onOpenEventModal={() => setEventModalOpen(true)}
              onAdjustClassQuota={handleAdjustClassQuota}
              onDeleteClass={handleDeleteClass}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              clients={clients}
              attendances={attendances}
              onCheckInAttempt={handleCheckInAttempt}
              onOpenQuickRenew={(c) => setQuickRenewClient(c)}
            />
          )}

          {activeTab === 'finances' && (
            <FinancesView
              summary={financeSummary}
              transactions={transactions}
              categories={categories}
              onCreateTransaction={handleCreateFinanceTx}
              onDeleteTransaction={handleDeleteFinanceTx}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              onOpenNewEmployee={() => setEmployeeModalOpen(true)}
              onToggleEmployee={handleToggleEmployee}
              onPayEmployeeSalary={handlePayEmployeeSalary}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {activeTab === 'equipment' && (
            <EquipmentView
              equipment={equipment}
              onOpenNewEquipment={() => setEquipmentModalOpen(true)}
              onCycleStatus={handleCycleEquipmentStatus}
              onDeleteEquipment={handleDeleteEquipment}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              metrics={metrics}
              clients={clients}
              auditLogs={auditLogs}
              onOpenQuickRenew={(c) => setQuickRenewClient(c)}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppAiView
              waStatus={waStatus}
              rules={trackingRules}
              candidates={trackingCandidates}
              logs={waLogs}
              onRefreshWa={refreshWhatsAppData}
              onConnectWa={handleConnectWa}
              onDisconnectWa={handleDisconnectWa}
              onRunAutomatedSweep={handleRunAutomatedSweep}
              onSendSingleCandidate={handleSendSingleCandidate}
              onUpdateRule={handleUpdateRule}
            />
          )}
        </main>
      </div>

      {/* Modales Globales */}
      <UserManagementModal
        isOpen={userModalOpen}
        users={systemUsers}
        onClose={() => setUserModalOpen(false)}
        onCreateUser={handleCreateSystemUser}
        onDeleteUser={handleDeleteSystemUser}
      />

      <ClientModal
        isOpen={clientModalOpen}
        editingClient={editingClient}
        onClose={() => {
          setClientModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
      />

      <QuickRenewModal
        isOpen={!!quickRenewClient}
        client={quickRenewClient}
        plans={plans}
        onClose={() => setQuickRenewClient(null)}
        onOpenPlanModal={() => setPlanModalOpen(true)}
        onConfirm={handleAssignMembership}
      />

      <PlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSave={handleCreatePlan}
      />

      <ClassModal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        onSave={handleCreateClass}
      />

      <EventModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSave={handleCreateEvent}
      />

      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onSave={handleCreateEmployee}
      />

      <EquipmentModal
        isOpen={equipmentModalOpen}
        onClose={() => setEquipmentModalOpen(false)}
        onSave={handleCreateEquipment}
      />

      <Toast
        message={toast?.msg || null}
        isError={toast?.isError}
        onClose={() => setToast(null)}
      />
    </div>
  );
};
