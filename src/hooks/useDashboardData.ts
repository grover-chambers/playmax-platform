import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { formatTimeAgo } from '@/lib/utils';

export interface DashboardStats {
  totalLeads: number;
  pipelineValue: number;
  activeProjects: number;
  collectedThisMonth: number;
  newLeadsToday: number;
  staleLeads: number;
}

export interface LeadPipelineItem {
  id: string;
  company: string;
  intent: string;
  value?: number;
  time: string;
  source: string;
  assigned_to: string;
  highlight?: boolean;
}

export interface LeadPipelineData {
  stage: string;
  leads: LeadPipelineItem[];
}

export interface StaffPerformance {
  name: string;
  role: string;
  progress: number;
  leads: number;
  closedValue: string;
}

export interface ClientHealth {
  name: string;
  status: 'Active' | 'Warm' | 'Cold';
  meta: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  industry: string;
  status: string;
  projectCount: number;
  totalValue: number;
  lastContact: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  client: string;
  client_id?: string;
  type: string;
  status: string;
  progress: number;
  value: number;
  deadline: string;
  assigned_to: string;
  created_at: string;
  milestones?: { label: string; done: boolean }[];
}

export interface TaskRecord {
  id: string;
  title: string;
  project?: string;
  project_id?: string;
  priority: string;
  status: string;
  due_date: string;
  assigned_to: string;
  created_at: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  client: string;
  client_id?: string;
  project?: string;
  amount: number;
  status: string;
  issued_date: string;
  due_date: string;
  paid_date?: string;
  notes?: string;
}

export interface ResearchProjectRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  summary: string;
  findings: string;
  sources: string[];
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    pipelineValue: 0,
    activeProjects: 0,
    collectedThisMonth: 0,
    newLeadsToday: 0,
    staleLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const supabase = createClient();

        const [
          { count: totalLeads },
          { data: leads },
          { count: activeProjects },
          { data: invoices },
          { count: newLeadsToday },
          { count: staleLeads },
        ] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          supabase.from('leads').select('value, created_at, status').eq('status', 'new'),
          supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('invoices').select('amount, status, issued_date').eq('status', 'paid'),
          supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
          supabase.from('leads').select('*', { count: 'exact', head: true }).lt('created_at', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()).in('status', ['new', 'contacted']),
        ]);

        const pipelineValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
        const collectedThisMonth = invoices?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

        setStats({
          totalLeads: totalLeads || 0,
          pipelineValue,
          activeProjects: activeProjects || 0,
          collectedThisMonth,
          newLeadsToday: newLeadsToday || 0,
          staleLeads: staleLeads || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, loading, error };
}

export function useLeadPipeline() {
  const [pipeline, setPipeline] = useState<LeadPipelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('leads')
          .select('id, company, intent, value, created_at, source, assigned_to, status')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const stages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
        const pipelineData = stages.map(stage => ({
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          leads: (data || [])
            .filter(l => l.status === stage)
            .map(l => ({
              id: l.id,
              company: l.company,
              intent: l.intent || 'General Inquiry',
              value: l.value,
              time: formatTimeAgo(l.created_at),
              source: l.source || 'Unknown',
              assigned_to: l.assigned_to || 'Unassigned',
            })),
        }));

        setPipeline(pipelineData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pipeline');
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, []);

  return { pipeline, loading, error };
}

export function useStaffPerformance() {
  const [staff, setStaff] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('leads')
          .select('assigned_to, status, value')
          .in('status', ['won']);

        if (error) throw error;

        const staffMap = new Map<string, { leads: number; value: number }>();
        (data || []).forEach(lead => {
          const assignee = lead.assigned_to || 'Unassigned';
          const current = staffMap.get(assignee) || { leads: 0, value: 0 };
          current.leads += 1;
          current.value += lead.value || 0;
          staffMap.set(assignee, current);
        });

        const staffArray = Array.from(staffMap.entries()).map(([name, data]) => ({
          name: formatName(name),
          role: getRole(name),
          progress: Math.min(100, Math.round((data.value / 1000000) * 100)),
          leads: data.leads,
          closedValue: `KES ${(data.value / 1000).toFixed(0)}K`,
        }));

        setStaff(staffArray);
      } catch (err) {
        console.error('Failed to fetch staff performance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, []);

  return { staff, loading };
}

export function useClientHealth() {
  const [clients, setClients] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('clients')
          .select('name, status, updated_at')
          .order('updated_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const clientHealth: ClientHealth[] = (data || []).map(c => ({
          name: c.name,
          status: (c.status === 'active' ? 'Active' : c.status === 'inactive' ? 'Cold' : 'Warm') as ClientHealth['status'],
          meta: `Last updated ${formatTimeAgo(c.updated_at)}`,
        }));

        setClients(clientHealth);
      } catch (err) {
        console.error('Failed to fetch client health:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  return { clients, loading };
}

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setClients(data || []);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  return { clients, loading };
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects((data as ProjectRecord[]) || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return { projects, loading };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks((data as TaskRecord[]) || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  return { tasks, loading };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('issued_date', { ascending: false });

        if (error) throw error;
        setInvoices((data as InvoiceRecord[]) || []);
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  return { invoices, loading };
}

export function useResearchProjects() {
  const [projects, setProjects] = useState<ResearchProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('research_projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects((data as ResearchProjectRecord[]) || []);
      } catch (err) {
        console.error('Failed to fetch research projects:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return { projects, loading };
}

export function useInventory() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .order('name');

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  return { items, loading };
}

function formatName(name: string): string {
  const nameMap: Record<string, string> = {
    brian: 'Brian Mwangi',
    amina: 'Amina Mwangi',
    james: 'James Kariuki',
    christine: 'Christine Kamau',
  };
  return nameMap[name.toLowerCase()] || name;
}

function getRole(name: string): string {
  const roleMap: Record<string, string> = {
    brian: 'Sales Director',
    amina: 'Lead Gen',
    james: 'Sales Exec',
    christine: 'Junior Sales',
  };
  return roleMap[name.toLowerCase()] || 'Staff';
}
