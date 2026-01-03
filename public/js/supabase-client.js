// Supabase client initialization
class SupabaseClient {
    constructor() {
        this.supabaseUrl = 'https://your-project-id.supabase.co';  // Replace with your URL
        this.supabaseAnonKey = 'your-anon-key';  // Replace with your key
        
        this.client = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
    }

    // Authentication methods
    async signInWithGoogle() {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard.html'
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signInWithEmail(email, password) {
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signUpWithEmail(email, password) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin + '/dashboard.html'
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.client.auth.getUser();
            
            if (error) throw error;
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getSession() {
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) throw error;
            return { success: true, session };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Database methods
    async getAccounts() {
        try {
            const { data, error } = await this.client
                .from('accounts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createAccount(accountData) {
        try {
            const { data, error } = await this.client
                .from('accounts')
                .insert([accountData])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getTransactions(filters = {}) {
        try {
            let query = this.client
                .from('transactions')
                .select(`
                    *,
                    category:categories(name, icon, color),
                    account:accounts(name)
                `)
                .order('date', { ascending: false });
            
            // Apply filters
            if (filters.account_id) {
                query = query.eq('account_id', filters.account_id);
            }
            if (filters.category_id) {
                query = query.eq('category_id', filters.category_id);
            }
            if (filters.start_date && filters.end_date) {
                query = query.gte('date', filters.start_date).lte('date', filters.end_date);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createTransaction(transactionData) {
        try {
            const { data, error } = await this.client
                .from('transactions')
                .insert([transactionData])
                .select(`
                    *,
                    category:categories(name, icon, color),
                    account:accounts(name)
                `)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCategories() {
        try {
            const { data, error } = await this.client
                .from('categories')
                .select('*')
                .or('is_default.eq.true,user_id.eq.' + (await this.getCurrentUser()).user?.id)
                .order('name');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getFinancialSummary(startDate, endDate) {
        try {
            // Get total income
            const { data: incomeData, error: incomeError } = await this.client
                .from('transactions')
                .select('amount')
                .eq('type', 'income')
                .gte('date', startDate)
                .lte('date', endDate);
            
            if (incomeError) throw incomeError;
            
            // Get total expenses
            const { data: expenseData, error: expenseError } = await this.client
                .from('transactions')
                .select('amount')
                .eq('type', 'expense')
                .gte('date', startDate)
                .lte('date', endDate);
            
            if (expenseError) throw expenseError;
            
            // Calculate totals
            const totalIncome = incomeData?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
            const totalExpense = expenseData?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
            const net = totalIncome - totalExpense;
            
            return {
                success: true,
                data: {
                    totalIncome,
                    totalExpense,
                    net,
                    startDate,
                    endDate
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Helper method to check if user is authenticated
    async isAuthenticated() {
        const result = await this.getCurrentUser();
        return result.success && result.user !== null;
    }

    // Subscribe to auth state changes
    onAuthStateChange(callback) {
        return this.client.auth.onAuthStateChange(callback);
    }
}

// Create global instance
window.supabaseClient = new SupabaseClient();
