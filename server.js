const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static('public'));

// Auth middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ========== ACCOUNTS API ==========

// Get all accounts for current user
app.get('/api/accounts', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ accounts: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single account
app.get('/api/accounts/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ account: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create account
app.post('/api/accounts', authenticate, async (req, res) => {
  try {
    const { name, account_type, opening_balance, meta } = req.body;
    
    const accountData = {
      user_id: req.user.id,
      name,
      account_type: account_type || 'cash',
      opening_balance: opening_balance || 0,
      current_balance: opening_balance || 0,
      meta: meta || {}
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert([accountData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ account: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
app.put('/api/accounts/:id', authenticate, async (req, res) => {
  try {
    const { name, account_type, meta } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (account_type) updateData.account_type = account_type;
    if (meta) updateData.meta = meta;

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ account: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account
app.delete('/api/accounts/:id', authenticate, async (req, res) => {
  try {
    // Check if account has ledger entries
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('account_id', req.params.id)
      .limit(1);

    if (entriesError) throw entriesError;
    
    if (entries && entries.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account with ledger entries' 
      });
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LEDGER ENTRIES API ==========

// Get all ledger entries with filters
app.get('/api/ledger', authenticate, async (req, res) => {
  try {
    let query = supabase
      .from('ledger_entries')
      .select(`
        *,
        account:account_id (name),
        related_account:related_account_id (name),
        category:category_id (name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (req.query.account_id) {
      query = query.eq('account_id', req.query.account_id);
    }
    if (req.query.entry_type) {
      query = query.eq('entry_type', req.query.entry_type);
    }
    if (req.query.start_date && req.query.end_date) {
      query = query.gte('created_at', req.query.start_date)
                   .lte('created_at', req.query.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    res.json({ entries: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ledger entry by ID
app.get('/api/ledger/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        account:account_id (name),
        related_account:related_account_id (name),
        category:category_id (name)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ledger entry
app.post('/api/ledger', authenticate, async (req, res) => {
  try {
    const { 
      account_id, 
      related_account_id, 
      amount, 
      entry_type, 
      category_id, 
      note 
    } = req.body;

    // Validate required fields
    if (!account_id || !amount || !entry_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entryData = {
      user_id: req.user.id,
      account_id,
      related_account_id,
      amount: parseFloat(amount),
      entry_type,
      category_id,
      note
    };

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([entryData])
      .select(`
        *,
        account:account_id (name, current_balance),
        related_account:related_account_id (name)
      `)
      .single();

    if (error) throw error;

    // Update account balance
    await updateAccountBalance(account_id, req.user.id);
    if (related_account_id) {
      await updateAccountBalance(related_account_id, req.user.id);
    }

    res.status(201).json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ledger entry
app.put('/api/ledger/:id', authenticate, async (req, res) => {
  try {
    const { amount, entry_type, category_id, note } = req.body;
    
    const updateData = {};
    if (amount) updateData.amount = parseFloat(amount);
    if (entry_type) updateData.entry_type = entry_type;
    if (category_id) updateData.category_id = category_id;
    if (note !== undefined) updateData.note = note;

    // Get old entry to update balances
    const { data: oldEntry, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('account_id, related_account_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('ledger_entries')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Update balances for affected accounts
    if (oldEntry) {
      await updateAccountBalance(oldEntry.account_id, req.user.id);
      if (oldEntry.related_account_id) {
        await updateAccountBalance(oldEntry.related_account_id, req.user.id);
      }
    }

    res.json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ledger entry
app.delete('/api/ledger/:id', authenticate, async (req, res) => {
  try {
    // Get entry before deletion to update balances
    const { data: oldEntry, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('account_id, related_account_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Update balances for affected accounts
    if (oldEntry) {
      await updateAccountBalance(oldEntry.account_id, req.user.id);
      if (oldEntry.related_account_id) {
        await updateAccountBalance(oldEntry.related_account_id, req.user.id);
      }
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CATEGORIES API ==========

// Get all categories (global + user-specific)
app.get('/api/categories', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .order('name');

    if (error) throw error;
    res.json({ categories: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
app.post('/api/categories', authenticate, async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    
    const categoryData = {
      user_id: req.user.id,
      name,
      parent_id: parent_id || null
    };

    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ category: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== FINANCIAL REPORTS API ==========

// Get financial summary
app.get('/api/reports/summary', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, current_balance')
      .eq('user_id', req.user.id);

    if (accountsError) throw accountsError;

    // Get ledger entries for period
    let ledgerQuery = supabase
      .from('ledger_entries')
      .select('amount, entry_type, category_id')
      .eq('user_id', req.user.id);

    if (start_date && end_date) {
      ledgerQuery = ledgerQuery
        .gte('created_at', start_date)
        .lte('created_at', end_date);
    }

    const { data: entries, error: entriesError } = await ledgerQuery;
    if (entriesError) throw entriesError;

    // Calculate totals
    const totals = {
      income: 0,
      expense: 0,
      transfer: 0,
      net: 0
    };

    if (entries) {
      entries.forEach(entry => {
        if (entry.entry_type === 'income') {
          totals.income += entry.amount;
        } else if (entry.entry_type === 'expense') {
          totals.expense += entry.amount;
        } else if (entry.entry_type === 'transfer') {
          totals.transfer += Math.abs(entry.amount);
        }
      });
    }

    totals.net = totals.income - totals.expense;

    // Get category breakdown
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .or(`user_id.eq.${req.user.id},user_id.is.null`);

    if (categoriesError) throw categoriesError;

    const categoryBreakdown = {};
    categories?.forEach(cat => {
      categoryBreakdown[cat.id] = {
        name: cat.name,
        total: 0
      };
    });

    if (entries) {
      entries.forEach(entry => {
        if (entry.category_id && categoryBreakdown[entry.category_id]) {
          if (entry.entry_type === 'expense') {
            categoryBreakdown[entry.category_id].total += entry.amount;
          }
        }
      });
    }

    res.json({
      summary: {
        accounts,
        totals,
        net_worth: accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction history
app.get('/api/reports/transactions', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        account:account_id (name),
        category:category_id (name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) throw countError;

    res.json({
      transactions: data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== HELPER FUNCTIONS ==========

async function updateAccountBalance(accountId, userId) {
  try {
    // Calculate current balance from ledger entries
    const { data: entries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('amount')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (entriesError) throw entriesError;

    const balance = entries?.reduce((sum, entry) => sum + parseFloat(entry.amount), 0) || 0;

    // Update account balance
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ current_balance: balance })
      .eq('id', accountId)
      .eq('user_id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating account balance:', error);
  }
}

// ========== SETUP ENDPOINTS ==========

// Initialize default data for new user
app.post('/api/setup/defaults', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Create default accounts
    const defaultAccounts = [
      {
        user_id: userId,
        name: 'Cash on Hand',
        account_type: 'cash',
        opening_balance: 0,
        current_balance: 0
      },
      {
        user_id: userId,
        name: 'Bank Account',
        account_type: 'bank',
        opening_balance: 0,
        current_balance: 0
      },
      {
        user_id: userId,
        name: 'Credit Card',
        account_type: 'credit_card',
        opening_balance: 0,
        current_balance: 0
      }
    ];

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .insert(defaultAccounts)
      .select();

    if (accountsError) throw accountsError;

    // Create default categories if none exist
    const { data: existingCategories, error: categoriesCheckError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (categoriesCheckError) throw categoriesCheckError;

    if (!existingCategories || existingCategories.length === 0) {
      const defaultCategories = [
        { user_id: userId, name: 'Food & Dining' },
        { user_id: userId, name: 'Transportation' },
        { user_id: userId, name: 'Shopping' },
        { user_id: userId, name: 'Entertainment' },
        { user_id: userId, name: 'Bills & Utilities' },
        { user_id: userId, name: 'Healthcare' },
        { user_id: userId, name: 'Education' },
        { user_id: userId, name: 'Salary' },
        { user_id: userId, name: 'Freelance' },
        { user_id: userId, name: 'Investment' }
      ];

      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .insert(defaultCategories)
        .select();

      if (categoriesError) throw categoriesError;

      res.json({
        message: 'Default data created successfully',
        accounts,
        categories
      });
    } else {
      res.json({
        message: 'Default accounts created successfully',
        accounts,
        categories_exist: true
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ERROR HANDLING ==========

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation:`);
  console.log(`  GET  /api/accounts - List accounts`);
  console.log(`  POST /api/accounts - Create account`);
  console.log(`  GET  /api/ledger - List ledger entries`);
  console.log(`  POST /api/ledger - Create ledger entry`);
  console.log(`  GET  /api/reports/summary - Financial summary`);
  console.log(`  POST /api/setup/defaults - Initialize default data`);
});
