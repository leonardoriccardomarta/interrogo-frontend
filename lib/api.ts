import axios from 'axios';

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const defaultApiOrigin = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
const rawBase = envApiUrl && envApiUrl.length > 0 ? envApiUrl : defaultApiOrigin;
const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

class ApiService {
  private client: any;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
    });

    // Add request interceptor to attach token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  // Auth endpoints
  async signup(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: 'student' | 'tutor' = 'student',
    organization?: string,
    className?: string
  ) {
    const response = await this.client.post('/auth/signup', {
      email,
      password,
      firstName,
      lastName,
      role,
      organization,
      className,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(payload: {
    firstName?: string;
    lastName?: string;
    organization?: string;
    className?: string;
  }) {
    const response = await this.client.patch('/auth/profile', payload);
    return response.data;
  }

  // Interrogo endpoints
  async startSession(
    topic: string,
    difficulty: number,
    personality: string,
    content: string,
    examMode: 'standard' | 'extended' | 'deep' = 'standard',
    targetQuestions?: number
  ) {
    const response = await this.client.post('/interrogo/start', {
      topic,
      difficulty,
      personality,
      content,
      examMode,
      targetQuestions,
    });
    return response.data;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    targetQuestions?: number,
    examMode: 'standard' | 'extended' | 'deep' = 'standard'
  ) {
    const response = await this.client.post('/interrogo/message', {
      sessionId,
      message,
      targetQuestions,
      examMode,
    });
    return response.data;
  }

  async endSession(sessionId: string) {
    const response = await this.client.post('/interrogo/end', {
      sessionId,
    });
    return response.data;
  }

  async getSession(sessionId: string) {
    const response = await this.client.get(`/interrogo/${sessionId}`);
    return response.data;
  }

  async getUserSessions() {
    const response = await this.client.get('/interrogo/list/all');
    return response.data;
  }

  async getAnalyticsOverview() {
    const response = await this.client.get('/interrogo/analytics/overview');
    return response.data;
  }

  async getTeacherOverview() {
    const response = await this.client.get('/interrogo/teacher/overview');
    return response.data;
  }

  async getTeacherReportCsv() {
    const response = await this.client.get('/interrogo/teacher/report.csv', {
      responseType: 'blob',
    });
    return response.data;
  }

  async getSlaSnapshot() {
    const healthBase = normalizedBase || '';
    const response = await axios.get(`${healthBase}/health/sla`, {
      timeout: 30000,
    });
    return response.data;
  }

  async getSlaHistory() {
    const healthBase = normalizedBase || '';
    const response = await axios.get(`${healthBase}/health/sla/history`, {
      timeout: 30000,
    });
    return response.data;
  }

  async getSlaAlerts() {
    const healthBase = normalizedBase || '';
    const response = await axios.get(`${healthBase}/health/sla/alerts`, {
      timeout: 30000,
    });
    return response.data;
  }

  async buildManualIndex(content: string) {
    const response = await this.client.post('/interrogo/manual-index', { content });
    return response.data;
  }

  async getModerationPolicy() {
    const response = await this.client.get('/interrogo/moderation/policy');
    return response.data;
  }

  async getModerationAudit() {
    const response = await this.client.get('/interrogo/moderation/audit');
    return response.data;
  }

  // Quick Test endpoints
  async startQuickTest(topic: string, difficulty: number = 5, personality: string = 'supportive') {
    const response = await this.client.post('/quick-test/start', {
      topic,
      difficulty,
      personality,
    });
    return response.data;
  }

  async answerQuickTest(sessionId: string, message: string) {
    const response = await this.client.post('/quick-test/answer', {
      sessionId,
      message,
    });
    return response.data;
  }

  async explainConcept(sessionId: string) {
    const response = await this.client.post('/interrogo/explain', {
      sessionId,
    });
    return response.data;
  }

  async exportAccountData() {
    const response = await this.client.get('/auth/export-data');
    return response.data;
  }

  async getRetentionPolicy() {
    const response = await this.client.get('/auth/retention-policy');
    return response.data;
  }

  async deleteAccount() {
    const response = await this.client.delete('/auth/delete-account');
    return response.data;
  }

  // Subscription endpoints
  async getSubscriptionStatus() {
    const response = await this.client.get('/subscription/status');
    return response.data;
  }

  async createCheckoutSession(plan: 'monthly' | 'annual') {
    const response = await this.client.post('/subscription/checkout', { plan });
    return response.data;
  }
}

export const apiService = new ApiService();
