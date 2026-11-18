
import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { supabase } from './lib/supabase';
import './App.css';

function Dashboard() {
  const [lang, setLang] = useState('ar');
  const [activePage, setActivePage] = useState('home');
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [activity, setActivity] = useState('');
  const [activeCompany, setActiveCompany] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState('');
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);
  const [financeMessage, setFinanceMessage] = useState('');
  const [completedTasks, setCompletedTasks] = useState({});
  const [forecastMode, setForecastMode] = useState('automatic');
  const [forecastMonths, setForecastMonths] = useState('6');
  const [forecastRevenueGrowth, setForecastRevenueGrowth] = useState('0');
  const [forecastExpenseGrowth, setForecastExpenseGrowth] = useState('0');

  const [cash, setCash] = useState('');
  const [revenue, setRevenue] = useState('');
  const [expenses, setExpenses] = useState('');
  const [drop, setDrop] = useState('');
  const [rise, setRise] = useState('');

  const fr = lang === 'fr';




  async function loadCompanies() {
    setLoadingCompanies(true);
    setCompanies([]);
    setActiveCompany('');

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setCompanyMessage('يرجى تسجيل الدخول.');
      setLoadingCompanies(false);
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .select('id, name, activity, created_at')
      .eq('owner_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setCompanyMessage(error.message);
    } else {
      setCompanies(data || []);
      if (data?.length) {
        setActiveCompany(data[0].id);
      }
    }

    setLoadingCompanies(false);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    async function loadFinance() {
      setCash('');
      setRevenue('');
      setExpenses('');
      setDrop('');
      setRise('');

      if (!activeCompany) {
        setLoadingFinance(false);
        return;
      }

      setLoadingFinance(true);
      setFinanceMessage('');

      const { data, error } = await supabase
        .from('company_finances')
        .select('cash, revenue, expenses, drop_percentage, rise_percentage')
        .eq('company_id', activeCompany)
        .maybeSingle();

      if (error) {
        setFinanceMessage(error.message);
      } else if (data) {
        setCash(String(data.cash));
        setRevenue(String(data.revenue));
        setExpenses(String(data.expenses));
        setDrop(String(data.drop_percentage));
        setRise(String(data.rise_percentage));
      }

      setLoadingFinance(false);
    }

    loadFinance();
  }, [activeCompany]);

  useEffect(() => {
    let cancelled = false;

    async function loadActionProgress() {
      if (!activeCompany) {
        setCompletedTasks({});
        return;
      }

      const { data, error } = await supabase
        .from('action_plan_progress')
        .select('completed_tasks')
        .eq('company_id', activeCompany)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error loading action progress:', error.message);
        setCompletedTasks({});
      } else {
        setCompletedTasks(data?.completed_tasks || {});
      }
    }

    loadActionProgress();

    return () => {
      cancelled = true;
    };
  }, [activeCompany]);

  async function addCompany(e) {
    e.preventDefault();
    setCompanyMessage('');

    if (!companyName.trim() || !activity.trim()) {
      setCompanyMessage(fr ? 'Veuillez remplir tous les champs.' : 'عمّري جميع الخانات.');
      return;
    }

    setSaving(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setCompanyMessage(fr ? 'Veuillez vous reconnecter.' : 'عاودي سجلي الدخول.');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: companyName.trim(),
        activity: activity.trim(),
        owner_id: userData.user.id
      })
      .select('id, name, activity, created_at')
      .single();

    if (error) {
      setCompanyMessage(error.message);
    } else {
      setCompanies(previous => [data, ...previous]);
      setActiveCompany(data.id);
      setCompanyName('');
      setActivity('');
      setCompanyMessage(fr ? 'Entreprise ajoutée avec succès.' : 'تمت إضافة المؤسسة بنجاح.');
    }

    setSaving(false);
  }

  async function saveFinance() {
    if (!activeCompany) return;

    if ([cash, revenue, expenses, drop, rise].some(value => String(value).trim() === '')) {
      setFinanceMessage(fr ? 'Veuillez remplir tous les champs financiers.' : 'يرجى ملء جميع الخانات المالية.');
      return;
    }

    if (num(drop) > 100) {
      setFinanceMessage('انخفاض الإيرادات لا يمكن أن يتجاوز 100٪.');
      return;
    }

    setSavingFinance(true);
    setFinanceMessage('');

    const { error } = await supabase
      .from('company_finances')
      .upsert({
        company_id: activeCompany,
        cash: num(cash),
        revenue: num(revenue),
        expenses: num(expenses),
        drop_percentage: num(drop),
        rise_percentage: num(rise),
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });

    if (error) {
      setFinanceMessage(error.message);
    } else {
      setFinanceMessage('تم حفظ البيانات المالية بنجاح.');
    }

    setSavingFinance(false);
  }

  const num = v => Math.max(0, Number(v) || 0);
  const c = num(cash);
  const r = num(revenue);
  const e = num(expenses);
  const d = num(drop);
  const h = num(rise);
  const financeFields = [cash, revenue, expenses, drop, rise];
  const hasFinanceData = financeFields.every(value =>
    String(value).trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
  const valid = hasFinanceData && d <= 100;

  const net = r - e;
  const normalBalance = c + net;
  const revenueAfter = r * (1 - d / 100);
  const expensesAfter = e * (1 + h / 100);
  const shockedNet = revenueAfter - expensesAfter;
  const shockedBalance = c + shockedNet;
  const loss = normalBalance - shockedBalance;

  const chartData = [
    {
      name: fr ? 'Revenus' : 'الإيرادات',
      before: num(revenue),
      after: revenueAfter
    },
    {
      name: fr ? 'Dépenses' : 'المصاريف',
      before: num(expenses),
      after: expensesAfter
    },
    {
      name: fr ? 'Trésorerie' : 'الرصيد النقدي',
      before: normalBalance,
      after: shockedBalance
    }
  ];

  // Future financial forecast after financial shock
  const revenueGrowthRate = forecastMode === 'custom'
    ? Number(forecastRevenueGrowth) || 0 : 0;

  const expenseGrowthRate = forecastMode === 'custom'
    ? Number(forecastExpenseGrowth) || 0 : 0;

  const forecastData = [];
  let projectedBalance = c;

  for (let month = 1; month <= Number(forecastMonths); month++) {
    const projectedRevenue = revenueAfter * Math.pow(
      Math.max(0, 1 + revenueGrowthRate / 100), month - 1
    );

    const projectedExpenses = expensesAfter * Math.pow(
      Math.max(0, 1 + expenseGrowthRate / 100), month - 1
    );

    projectedBalance += projectedRevenue - projectedExpenses;

    forecastData.push({
      month: fr ? `Month ${month}` : `الشهر ${month}`,
      balance: Math.round(projectedBalance),
      revenue: Math.round(projectedRevenue),
      expenses: Math.round(projectedExpenses)
    });
  }

  const forecastEndBalance = forecastData.length
    ? forecastData[forecastData.length - 1].balance : shockedBalance;

  const firstDeficit = forecastData.find(item => item.balance < 0);

  const forecastStatus = firstDeficit
    ? 'danger'
    : forecastEndBalance < expensesAfter * 3 ? 'warning' : 'safe';

  const money = n =>
    new Intl.NumberFormat(fr ? 'fr-FR' : 'ar-DZ').format(
      Math.round(n)
    ) + ' DA';

  // Indicateur de risque financier sur 100
  const liquidityRisk = shockedBalance < 0
    ? 100
    : expensesAfter > 0
    ? Math.max(0, Math.min(100, (1 - shockedBalance / (expensesAfter * 3)) * 100))
    : 0;

  const impactRisk = normalBalance > 0
    ? Math.max(0, Math.min(100, (loss / normalBalance) * 100))
    : loss > 0 ? 100 : 0;

  const riskScore = !valid
    ? 0
    : Math.round(Math.max(0, Math.min(100, liquidityRisk * 0.7 + impactRisk * 0.3)));

  const status = !valid
    ? (fr ? 'Données invalides' : 'بيانات غير صالحة')
    : riskScore >= 61
    ? (fr ? 'Risque élevé' : 'خطر مرتفع')
    : riskScore >= 31
    ? (fr ? 'Risque modéré' : 'خطر متوسط')
    : (fr ? 'Risque faible' : 'خطر منخفض');

  const riskClass = !valid || riskScore >= 61
    ? 'danger'
    : riskScore >= 31
    ? 'warning'
    : 'safe';


  // Financial health score
  const healthScore = valid ? 100 - riskScore : 0;

  const healthStatus = !valid
    ? (fr ? 'Unavailable' : 'غير متاحة')
    : healthScore >= 80
    ? (fr ? 'Good' : 'جيدة')
    : healthScore >= 50
    ? (fr ? 'Moderate' : 'متوسطة')
    : (fr ? 'Weak' : 'ضعيفة');

  const healthClass = !valid
    ? 'danger'
    : healthScore >= 80
    ? 'safe'
    : healthScore >= 50
    ? 'warning'
    : 'danger';

  // Smart financial diagnosis
  const expenseRatio = r > 0 ? (e / r) * 100 : null;
  const liquidityMonths = expensesAfter > 0
    ? shockedBalance / expensesAfter
    : null;

  // Individual financial indicators
  const liquidityClass = !valid || liquidityMonths === null
    ? 'danger'
    : liquidityMonths >= 3 ? 'safe'
    : liquidityMonths >= 1 ? 'warning' : 'danger';

  const expenseClass = !valid || expenseRatio === null
    ? 'danger'
    : expenseRatio < 70 ? 'safe'
    : expenseRatio < 100 ? 'warning' : 'danger';

  const impactClass = !valid ? 'danger'
    : impactRisk <= 30 ? 'safe'
    : impactRisk <= 60 ? 'warning' : 'danger';

  const indicatorLabel = cls => !valid
    ? (fr ? 'Unavailable' : 'غير متاح')
    : cls === 'safe'
    ? (fr ? 'Good' : 'جيد')
    : cls === 'warning'
    ? (fr ? 'Moderate' : 'متوسط')
    : (fr ? 'High risk' : 'خطر');

  const riskReasons = [];
  const smartRecommendations = [];

  if (!valid) {
    riskReasons.push(fr
      ? 'Financial data is invalid. Check the shock percentage.'
      : 'البيانات المالية غير صالحة. تحققي من نسبة الصدمة.');
  } else {
    if (shockedBalance < 0) {
      riskReasons.push(fr
        ? 'The projected balance after the shock is negative.'
        : 'الرصيد المتوقع بعد الصدمة أصبح سالباً.');
      smartRecommendations.push(fr
        ? 'Reduce non-essential expenses.'
        : 'قلّصي المصاريف غير الضرورية.');
    }

    if (liquidityMonths !== null && liquidityMonths >= 0 && liquidityMonths < 1) {
      riskReasons.push(fr
        ? 'Cash covers less than one month of expenses.'
        : 'السيولة لا تكفي لتغطية شهر واحد من المصاريف.');
      smartRecommendations.push(fr
        ? 'Build an emergency cash reserve.'
        : 'اعملي على تكوين احتياطي نقدي للطوارئ.');
    } else if (liquidityMonths !== null && liquidityMonths >= 1 && liquidityMonths < 3) {
      riskReasons.push(fr
        ? 'Cash covers less than three months of expenses.'
        : 'الرصيد يغطي أقل من ثلاثة أشهر من المصاريف.');
      smartRecommendations.push(fr
        ? 'Increase available cash.'
        : 'اعملي على زيادة السيولة المتاحة.');
    }

    if (expenseRatio !== null && expenseRatio >= 100) {
      riskReasons.push(fr
        ? 'Expenses equal or exceed revenues.'
        : 'المصاريف تساوي الإيرادات أو تفوقها.');
      smartRecommendations.push(fr
        ? 'Review operating costs.'
        : 'راجعي تكاليف النشاط وحددي فرص التوفير.');
    } else if (expenseRatio !== null && expenseRatio >= 70) {
      riskReasons.push(fr
        ? 'Expenses represent a high share of revenues.'
        : 'المصاريف تمثل نسبة مرتفعة من الإيرادات.');
      smartRecommendations.push(fr
        ? 'Control recurring expenses.'
        : 'راقبي المصاريف المتكررة.');
    }

    if (r === 0 && e > 0) {
      riskReasons.push(fr
        ? 'No revenue is recorded despite existing expenses.'
        : 'لا توجد إيرادات مسجلة رغم وجود مصاريف.');
      smartRecommendations.push(fr
        ? 'Review revenue records.'
        : 'راجعي تسجيل الإيرادات واعملي على تحسين التحصيل.');
    }

    if (d > 0) {
      riskReasons.push(fr
        ? 'The scenario assumes a revenue decline of ' + d + '%.'
        : 'السيناريو يفترض انخفاض الإيرادات بنسبة ' + d + '٪.');
      smartRecommendations.push(fr
        ? 'Diversify revenue sources.'
        : 'نوّعي مصادر الإيرادات وحافظي على الزبائن.');
    }

    if (h > 0) {
      riskReasons.push(fr
        ? 'The scenario assumes an expense increase of ' + h + '%.'
        : 'السيناريو يفترض ارتفاع المصاريف بنسبة ' + h + '٪.');
      smartRecommendations.push(fr
        ? 'Review supplier prices and purchasing costs.'
        : 'راجعي أسعار الموردين وتكاليف الشراء.');
    }

    if (riskReasons.length === 0) {
      riskReasons.push(fr
        ? 'No major weakness was detected in the entered figures.'
        : 'لم يتم رصد نقطة ضعف كبيرة في الأرقام المدخلة.');
      smartRecommendations.push(fr
        ? 'Continue monitoring cash flow.'
        : 'واصلي متابعة التدفقات النقدية وحافظي على احتياطي مالي.');
    }
  }

  const actionTasks = riskClass === 'danger'
    ? [
        fr ? 'Reduce non-essential spending immediately.' : 'تقليص المصاريف غير الضرورية فوراً.',
        fr ? 'Prioritize urgent payments and negotiate deadlines.' : 'ترتيب المدفوعات حسب الأولوية والتفاوض حول آجال التسديد.',
        fr ? 'Accelerate customer collections and seek suitable financing.' : 'تسريع تحصيل مستحقات الزبائن والبحث عن تمويل مناسب.',
        fr ? 'Prepare a weekly cash-flow recovery plan.' : 'إعداد خطة أسبوعية لاستعادة التوازن النقدي.'
      ]
    : riskClass === 'warning'
    ? [
        fr ? 'Review monthly expenses and identify savings.' : 'مراجعة المصاريف الشهرية وتحديد فرص التوفير.',
        fr ? 'Collect customer payments on time.' : 'تحصيل مستحقات الزبائن في آجالها.',
        fr ? 'Build a cash reserve for unexpected expenses.' : 'تكوين احتياطي نقدي لمواجهة المصاريف المفاجئة.',
        fr ? 'Review the risk score after each financial update.' : 'إعادة تقييم مؤشر المخاطر بعد كل تحديث للبيانات المالية.'
      ]
    : [
        fr ? 'Maintain current spending discipline.' : 'الحفاظ على الانضباط الحالي في المصاريف.',
        fr ? 'Set aside part of available cash as a reserve.' : 'تخصيص جزء من السيولة المتاحة كاحتياطي.',
        fr ? 'Monitor revenues and expenses monthly.' : 'متابعة الإيرادات والمصاريف شهرياً.',
        fr ? 'Test different economic shock scenarios regularly.' : 'اختبار سيناريوهات مختلفة للصدمات الاقتصادية بانتظام.'
      ];

  const completedCount = (completedTasks[riskClass] || []).length;
  const progressPercent = Math.round((completedCount / actionTasks.length) * 100);

  async function toggleActionTask(index, checked) {
    if (!activeCompany) return;

    const currentTasks = completedTasks[riskClass] || [];
    const nextTasks = checked
      ? [...currentTasks, index]
      : currentTasks.filter(item => item !== index);

    const nextState = {
      ...completedTasks,
      [riskClass]: nextTasks
    };

    setCompletedTasks(nextState);

    const { error } = await supabase
      .from('action_plan_progress')
      .upsert({
        company_id: activeCompany,
        completed_tasks: nextState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });

    if (error) {
      console.error('Error saving action progress:', error.message);
    }
  }

  const selectedCompany = companies.find(
    company => company.id === activeCompany
  );

  return (
    <div className="app" dir={fr ? 'ltr' : 'rtl'}>
      <header className="topbar">
        <div>
          <h2>CashShock DZ</h2>
          <p>{fr
            ? 'Simulateur des flux de trésorerie'
            : 'محاكي التدفقات النقدية تحت الصدمات الاقتصادية'}
          </p>
        </div>

        <button className="lang-btn"
          onClick={() => setLang(fr ? 'ar' : 'fr')}>
          {fr ? 'العربية 🇩🇿' : 'Français 🇫🇷'}
        </button>
      </header>

      <nav className="main-nav">
        {[
          ['home', fr ? 'Accueil' : 'الرئيسية'],
          ['cash', fr ? 'Trésorerie' : 'التدفقات النقدية'],
          ['simulation', fr ? 'Simulation' : 'محاكاة الصدمات'],
          ['charts', fr ? 'Graphiques' : 'الرسوم البيانية'],
          ['forecast', fr ? 'Prévisions financières' : 'التنبؤ المالي'],
          ['recommendations', fr ? 'Conseils' : 'التوصيات'],
          ['reports', fr ? 'Rapports' : 'التقارير']
        ].map(([page, label]) => (
          <button
            key={page}
            className={activePage === page ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActivePage(page)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main>
{activePage === 'home' && (
        <>
        <section className="welcome">
          <h1>{fr ? 'Tableau de bord' : 'لوحة التحكم'}</h1>
          <p>{fr
            ? 'Gérez vos entreprises et analysez leur situation financière.'
            : 'سيّر مؤسساتك وحلّل وضعيتها المالية بسهولة.'}
          </p>
        </section>

        <section className="panel">
          <h2>{fr ? 'Gestion des entreprises' : 'تسيير المؤسسات'}</h2>

          <form onSubmit={addCompany}>
            <label>{fr ? 'Nom de l’entreprise' : 'اسم المؤسسة'}</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder={fr ? 'Nom de l’entreprise' : 'مثال: مؤسسة النور'}
              required
            />

            <label>{fr ? 'Activité' : 'نشاط المؤسسة'}</label>
            <input
              value={activity}
              onChange={e => setActivity(e.target.value)}
              placeholder={fr ? 'Activité de l’entreprise' : 'مثال: تجارة، صناعة، خدمات'}
              required
            />

            <button className="lang-btn" type="submit" disabled={saving}>
              {saving
                ? (fr ? 'Enregistrement...' : 'جاري الحفظ...')
                : (fr ? 'Ajouter l’entreprise' : 'إضافة المؤسسة')}
            </button>
          </form>

          {companyMessage && <p>{companyMessage}</p>}

          <h3>{fr ? 'Mes entreprises' : 'مؤسساتي'}</h3>

          {loadingCompanies ? (
            <p>{fr ? 'Chargement...' : 'جاري تحميل المؤسسات...'}</p>
          ) : companies.length === 0 ? (
            <p>{fr ? 'Aucune entreprise enregistrée.' : 'مازال ما سجلتي حتى مؤسسة.'}</p>
          ) : (
            companies.map(company => (
              <div key={company.id} className="stat-card" style={{marginTop: 12}}>
                <label>
                  <input
                    type="radio"
                    name="activeCompany"
                    checked={activeCompany === company.id}
                    onChange={() => setActiveCompany(company.id)}
                    style={{width: 'auto', marginLeft: 8}}
                  />
                  {company.name}
                </label>
                <p>{company.activity}</p>
                {activeCompany === company.id && (
                  <strong>{fr ? 'Entreprise sélectionnée' : 'المؤسسة المختارة'}</strong>
                )}
              </div>
            ))
          )}
        </section>

        {selectedCompany && (
          <p>
            {fr ? 'Analyse de l’entreprise :' : 'التحليل المالي للمؤسسة:'}
            {' '}{selectedCompany.name}
          </p>
        )}

        <h2 className="section-title">
          {fr ? 'Situation financière' : 'الوضعية المالية'}
        </h2>

        <section className="stats">
          <div className="stat-card">
            <span>{fr ? 'Total des entreprises' : 'عدد المؤسسات المسجلة'}</span>
            <strong>{companies.length}</strong>
          </div>
          <div className="stat-card">
            <span>{fr ? 'Trésorerie initiale' : 'الرصيد الأولي'}</span>
            <strong>{money(c)}</strong>
          </div>
          <div className="stat-card">
            <span>{fr ? 'Flux net normal' : 'صافي التدفقات العادية'}</span>
            <strong>{money(net)}</strong>
          </div>
          <div className="stat-card">
            <span>{fr ? 'Solde prévisionnel' : 'الرصيد المتوقع'}</span>
            <strong>{money(normalBalance)}</strong>
          </div>
          <div className={`stat-card ${riskClass}`}>
            <span>{fr ? 'Financial risk' : 'مستوى الخطر المالي'}</span>
            <strong>{riskScore}/100</strong>
            <p className={riskClass}>{status}</p>
          </div>
        </section>
        </>
        )}

        {activePage === 'cash' && (
        <section className="panel">
          <h2>{fr ? 'Données financières' : 'البيانات المالية'}</h2>

          <label>{fr ? 'Trésorerie initiale (DA)' : 'الرصيد النقدي الأولي (دج)'}</label>
          <input type="number" min="0" value={cash}
            onChange={e => setCash(e.target.value)} />

          <label>{fr ? 'Revenus mensuels (DA)' : 'الإيرادات الشهرية (دج)'}</label>
          <input type="number" min="0" value={revenue}
            onChange={e => setRevenue(e.target.value)} />

          <label>{fr ? 'Dépenses mensuelles (DA)' : 'المصاريف الشهرية (دج)'}</label>
          <input type="number" min="0" value={expenses}
            onChange={e => setExpenses(e.target.value)} />
        </section>

        )}

        {activePage === 'simulation' && (
        <section className="panel">
          <h2>{fr ? 'Simulation des chocs économiques' : 'محاكاة الصدمات الاقتصادية'}</h2>

          <label>{fr ? 'Baisse des revenus (%)' : 'نسبة انخفاض الإيرادات (%)'}</label>
          <input type="number" min="0" max="100" value={drop}
            onChange={e => setDrop(e.target.value)} />

          <label>{fr ? 'Hausse des dépenses (%)' : 'نسبة ارتفاع المصاريف (%)'}</label>
          <input type="number" min="0" value={rise}
            onChange={e => setRise(e.target.value)} />

          <button
            className="lang-btn"
            type="button"
            onClick={saveFinance}
            disabled={savingFinance || loadingFinance || !activeCompany || !valid}
            style={{ marginTop: 20, width: '100%' }}
          >
            {savingFinance ? 'جاري الحفظ...' : 'حفظ البيانات المالية'}
          </button>

          {financeMessage && <p>{financeMessage}</p>}

          {!hasFinanceData && (
            <p className="danger">
              {fr ? 'Veuillez remplir les données financières avant l’analyse.' : 'يرجى ملء جميع البيانات المالية قبل عرض التحليل.'}
            </p>
          )}

          {hasFinanceData && !valid && (
            <p className="danger">
              {fr ? 'La baisse ne peut pas dépasser 100%.' : 'نسبة انخفاض الإيرادات لا يمكن أن تتجاوز 100٪.'}
            </p>
          )}

          {valid && (
            <>
              <div className={`result ${riskClass}`}>
                <span>{fr ? 'Solde après le choc' : 'الرصيد بعد الصدمة'}</span>
                <strong>{money(shockedBalance)}</strong>
                <p className={riskClass}>{status}</p>

              <div className={`risk-score-box ${riskClass}`}>
                <span>{fr ? 'Financial risk score' : 'مؤشر المخاطر المالية'}</span>
                <strong>{riskScore}<small>/100</small></strong>
                <p>{status}</p>
              </div>
              </div>

              <div className="details">
                <h3>{fr ? 'Résultats détaillés' : 'النتائج التفصيلية'}</h3>

                <div className="detail-row">
                  <span>{fr ? 'Revenus après choc' : 'الإيرادات بعد الصدمة'}</span>
                  <strong>{money(revenueAfter)}</strong>
                </div>

                <div className="detail-row">
                  <span>{fr ? 'Dépenses après choc' : 'المصاريف بعد الصدمة'}</span>
                  <strong>{money(expensesAfter)}</strong>
                </div>

                <div className="detail-row">
                  <span>{fr ? 'Flux net après choc' : 'صافي التدفق بعد الصدمة'}</span>
                  <strong>{money(shockedNet)}</strong>
                </div>

                <div className="detail-row">
                  <span>{fr ? 'Solde sans choc' : 'الرصيد دون صدمة'}</span>
                  <strong>{money(normalBalance)}</strong>
                </div>

                <div className="detail-row">
                  <span>{fr ? 'Impact financier' : 'الخسارة الناتجة عن الصدمة'}</span>
                  <strong>{money(loss)}</strong>
                </div>
              </div>



            </>
          )}
        </section>

        )}

        {activePage === 'charts' && (
          <section className="panel">
            <div className="chart-card">
                <h3>{fr ? 'Comparaison avant et après le choc' : 'مقارنة الوضعية قبل الصدمة وبعدها'}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a9bed3" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#a9bed3" }} width={48} />
                    <Tooltip formatter={(value) => money(value)} />
                    <Legend />
                    <Bar dataKey="before" name={fr ? 'Avant le choc' : 'قبل الصدمة'} fill="#FACC15" barSize={38} radius={[10, 10, 0, 0]} />
                    <Bar dataKey="after" name={fr ? 'Après le choc' : 'بعد الصدمة'} fill="#F97316" barSize={38} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            {!valid && <p>{fr ? 'Corrigez les données financières.' : 'يرجى تصحيح البيانات المالية أولاً.'}</p>}
          </section>
        )}

        {activePage === 'forecast' && (
          <section className="panel forecast-panel">
            <h2>{fr ? 'Future financial forecast' : 'التنبؤ المالي المستقبلي'}</h2>
            <p>
              {fr
                ? 'Estimate the company cash balance in the coming months.'
                : 'توقّعي تطور الرصيد النقدي للمؤسسة خلال الأشهر القادمة.'}
            </p>

            <div className="forecast-modes">
              <button
                type="button"
                className={forecastMode === 'automatic' ? 'active' : ''}
                onClick={() => setForecastMode('automatic')}
              >
                {fr ? 'Automatic forecast' : 'التنبؤ التلقائي'}
              </button>
              <button
                type="button"
                className={forecastMode === 'custom' ? 'active' : ''}
                onClick={() => setForecastMode('custom')}
              >
                {fr ? 'Custom forecast' : 'التنبؤ المخصص'}
              </button>
            </div>

            <div className="forecast-controls">
              <label>
                {fr ? 'Forecast duration' : 'مدة التنبؤ'}
                <select
                  value={forecastMonths}
                  onChange={e => setForecastMonths(e.target.value)}
                >
                  <option value="3">3 {fr ? 'months' : 'أشهر'}</option>
                  <option value="6">6 {fr ? 'months' : 'أشهر'}</option>
                  <option value="12">12 {fr ? 'months' : 'شهراً'}</option>
                </select>
              </label>

              {forecastMode === 'custom' && (
                <>
                  <label>
                    {fr ? 'Monthly revenue growth (%)' : 'نمو الإيرادات شهرياً (%)'}
                    <input
                      type="number"
                      step="0.5"
                      value={forecastRevenueGrowth}
                      onChange={e => setForecastRevenueGrowth(e.target.value)}
                    />
                  </label>

                  <label>
                    {fr ? 'Monthly expense change (%)' : 'تغير المصاريف شهرياً (%)'}
                    <input
                      type="number"
                      step="0.5"
                      value={forecastExpenseGrowth}
                      onChange={e => setForecastExpenseGrowth(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            {!valid || !activeCompany ? (
              <p className="forecast-warning">
                {fr ? 'Select a company and check its financial data first.' : 'اختاري مؤسسة وتأكدي من صحة بياناتها المالية أولاً.'}
              </p>
            ) : (
              <>
                <div className="forecast-summary">
                  <div className="forecast-stat">
                    <span>{fr ? 'Current cash balance' : 'الرصيد الحالي'}</span>
                    <strong>{money(c)}</strong>
                  </div>
                  <div className="forecast-stat">
                    <span>{fr ? 'Expected balance' : 'الرصيد المتوقع'}</span>
                    <strong>{money(forecastEndBalance)}</strong>
                  </div>
                  <div className={`forecast-stat ${forecastStatus}`}>
                    <span>{fr ? 'Forecast assessment' : 'تقييم التوقعات'}</span>
                    <strong>
                      {firstDeficit
                        ? (fr ? 'Cash deficit' : 'عجز نقدي محتمل')
                        : forecastStatus === 'warning'
                        ? (fr ? 'Needs monitoring' : 'يستدعي المراقبة')
                        : (fr ? 'Stable' : 'مستقرة')}
                    </strong>
                  </div>
                </div>

                {firstDeficit && (
                  <p className="forecast-warning">
                    {fr
                      ? `Warning: a negative balance is expected in ${firstDeficit.month}.`
                      : `تنبيه: يُتوقع تسجيل رصيد سالب في ${firstDeficit.month}.`}
                  </p>
                )}

                <div className="chart-card">
                  <h3>{fr ? 'Expected cash balance' : 'تطور الرصيد النقدي المتوقع'}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={value => money(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        name={fr ? 'Expected balance' : 'الرصيد المتوقع'}
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="forecast-table-wrap">
                  <h3>{fr ? 'Monthly forecast details' : 'تفاصيل التوقعات الشهرية'}</h3>
                  <table className="forecast-table">
                    <thead>
                      <tr>
                        <th>{fr ? 'Month' : 'الشهر'}</th>
                        <th>{fr ? 'Revenue' : 'الإيرادات'}</th>
                        <th>{fr ? 'Expenses' : 'المصاريف'}</th>
                        <th>{fr ? 'Balance' : 'الرصيد'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map(item => (
                        <tr key={item.month}>
                          <td>{item.month}</td>
                          <td>{money(item.revenue)}</td>
                          <td>{money(item.expenses)}</td>
                          <td>{money(item.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="forecast-note">
                  {fr
                    ? 'These are estimates based on current data and selected assumptions, not guaranteed results.'
                    : 'هذه توقعات تقديرية مبنية على البيانات الحالية والافتراضات المختارة، وليست نتائج مضمونة.'}
                </p>
              </>
            )}
          </section>
        )}

        {activePage === 'recommendations' && (
          <section className="panel">
            <div className={`recommendations ${riskClass}`}>
                <h3>{fr ? 'Conseils et recommandations' : 'الملاحظات والتوصيات المالية'}</h3>

              <div className={`risk-score-box ${riskClass}`}>
                <span>{fr ? 'Financial risk score' : 'مؤشر المخاطر المالية'}</span>
                <strong>{riskScore}<small>/100</small></strong>
                <p>{status}</p>
              </div>


                <div className="risk-explanation">
                  <h4>{fr ? 'Comprendre le score' : 'كيفاش نفهمو نتيجة المخاطر؟'}</h4>
                  <p>{fr
                    ? 'The score combines two factors:'
                    : 'المؤشر يجمع بين عاملين:'}</p>
                  <ul>
                    <li>{fr
                      ? 'Liquidity risk (70%): ability to cover expenses after the shock.'
                      : 'مخاطر السيولة (70٪): قدرة الرصيد بعد الصدمة على تغطية المصاريف.'}</li>
                    <li>{fr
                      ? 'Shock impact (30%): loss compared with the normal balance.'
                      : 'أثر الصدمة (30٪): الخسارة مقارنة بالرصيد العادي.'}</li>
                  </ul>
                  <p>{fr
                    ? '0–30: low risk; 31–60: moderate risk; 61–100: high risk.'
                    : 'من 0 إلى 30: خطر منخفض؛ 31 إلى 60: متوسط؛ 61 إلى 100: مرتفع.'}</p>
                  <p>{fr
                    ? 'This is an indicative estimate, not an official rating.'
                    : 'هذا تقييم تقديري للمساعدة في التحليل، وليس تصنيفاً رسمياً.'}</p>
                </div>

                <div className="smart-analysis">
                  <h4>{fr ? 'Smart financial diagnosis' : 'التشخيص المالي الذكي'}</h4>

                  <div className={`health-score-box ${healthClass}`}>
                    <span>{fr ? 'Financial health score' : 'درجة الصحة المالية'}</span>
                    <strong>{healthScore}/100</strong>
                    <p>{healthStatus}</p>
                  </div>

                  <div className="financial-indicators">
                    <h4>{fr ? 'Individual indicator assessment' : 'تقييم المؤشرات المالية'}</h4>

                    <div className={`indicator-item ${liquidityClass}`}>
                      <span>{fr ? 'Cash liquidity' : 'السيولة النقدية'}</span>
                      <strong>{liquidityMonths === null ? (fr ? 'N/A' : 'غير متاح') : liquidityMonths.toFixed(1) + (fr ? ' months' : ' أشهر')}</strong>
                      <small>{indicatorLabel(liquidityClass)}</small>
                    </div>

                    <div className={`indicator-item ${expenseClass}`}>
                      <span>{fr ? 'Expense ratio' : 'نسبة المصاريف'}</span>
                      <strong>{expenseRatio === null ? (fr ? 'N/A' : 'غير متاح') : expenseRatio.toFixed(1) + '%'}</strong>
                      <small>{indicatorLabel(expenseClass)}</small>
                    </div>

                    <div className={`indicator-item ${impactClass}`}>
                      <span>{fr ? 'Shock impact' : 'تأثير الصدمة'}</span>
                      <strong>{Math.round(impactRisk)}/100</strong>
                      <small>{indicatorLabel(impactClass)}</small>
                    </div>
                  </div>

                  <p>
                    {fr ? 'Expense-to-revenue ratio: ' : 'نسبة المصاريف إلى الإيرادات: '}
                    <strong>
                      {expenseRatio === null
                        ? (fr ? 'Not available' : 'غير متاحة')
                        : expenseRatio.toFixed(1) + '%'}
                    </strong>
                  </p>

                  <p>
                    {fr ? 'Cash coverage after shock: ' : 'تغطية المصاريف بالرصيد بعد الصدمة: '}
                    <strong>
                      {liquidityMonths === null
                        ? (fr ? 'Not available' : 'غير متاحة')
                        : Math.max(0, liquidityMonths).toFixed(1) + (fr ? ' months' : ' أشهر')}
                    </strong>
                  </p>

                  <h4>{fr ? 'Detected risk factors' : 'أسباب الخطر المكتشفة'}</h4>
                  <ul>
                    {riskReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>

                  <h4>{fr ? 'Recommendations based on your data' : 'توصيات حسب بيانات المؤسسة'}</h4>
                  <ul>
                    {smartRecommendations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {riskClass === 'danger' ? (
                  <>
                    <p>{fr ? '⚠️ Risque financier élevé : la trésorerie prévisionnelle est négative.' : '🔴 خطر مالي مرتفع: الرصيد المتوقع بعد الصدمة سالب.'}</p>
                    <ul>
                      <li>{fr ? 'Réduire les dépenses non essentielles.' : 'تقليص المصاريف غير الضرورية.'}</li>
                      <li>{fr ? 'Chercher de nouvelles sources de financement.' : 'البحث عن مصادر تمويل إضافية.'}</li>
                      <li>{fr ? 'Améliorer le recouvrement des créances.' : 'تسريع تحصيل مستحقات المؤسسة.'}</li>
                    </ul>
                  </>
                ) : riskClass === 'warning' ? (
                  <>
                    <p>{fr ? '🟠 Situation à surveiller : la liquidité est limitée.' : '🟠 وضعية تستدعي المراقبة: السيولة المالية محدودة.'}</p>
                    <ul>
                      <li>{fr ? 'Surveiller les dépenses régulièrement.' : 'مراقبة المصاريف بانتظام.'}</li>
                      <li>{fr ? 'Éviter les dépenses non prioritaires.' : 'تجنب النفقات غير ذات الأولوية.'}</li>
                      <li>{fr ? 'Prévoir une réserve de trésorerie.' : 'تكوين احتياطي نقدي للطوارئ.'}</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>{fr ? '🟢 Situation stable : l’entreprise résiste au choc simulé.' : '🟢 وضعية مستقرة: المؤسسة قادرة على تحمل الصدمة المفترضة.'}</p>
                    <ul>
                      <li>{fr ? 'Maintenir un bon équilibre financier.' : 'الحفاظ على التوازن المالي الحالي.'}</li>
                      <li>{fr ? 'Continuer à suivre les flux de trésorerie.' : 'مواصلة متابعة التدفقات النقدية.'}</li>
                      <li>{fr ? 'Préparer une réserve pour les imprévus.' : 'تخصيص احتياطي لمواجهة الظروف المفاجئة.'}</li>
                    </ul>
                  </>
                )}

                <div className="action-plan">
                  <h3>{fr ? 'Smart action plan' : 'خطة العمل المقترحة'}</h3>
                  <p>{fr
                    ? 'Practical steps to improve the company financial position:'
                    : 'خطوات عملية لتحسين الوضعية المالية للمؤسسة:'}</p>
                  <ol>
                    {riskClass === 'danger' ? (
                      <>
                        <li>{fr ? 'Reduce non-essential spending immediately.' : 'تقليص المصاريف غير الضرورية فوراً.'}</li>
                        <li>{fr ? 'Prioritize urgent payments and negotiate deadlines.' : 'ترتيب المدفوعات حسب الأولوية والتفاوض حول آجال التسديد.'}</li>
                        <li>{fr ? 'Accelerate customer collections and seek suitable financing.' : 'تسريع تحصيل مستحقات الزبائن والبحث عن تمويل مناسب.'}</li>
                        <li>{fr ? 'Prepare a weekly cash-flow recovery plan.' : 'إعداد خطة أسبوعية لاستعادة التوازن النقدي.'}</li>
                      </>
                    ) : riskClass === 'warning' ? (
                      <>
                        <li>{fr ? 'Review monthly expenses and identify possible savings.' : 'مراجعة المصاريف الشهرية وتحديد فرص التوفير.'}</li>
                        <li>{fr ? 'Collect customer payments on time.' : 'تحصيل مستحقات الزبائن في آجالها.'}</li>
                        <li>{fr ? 'Build a cash reserve for unexpected expenses.' : 'تكوين احتياطي نقدي لمواجهة المصاريف المفاجئة.'}</li>
                        <li>{fr ? 'Review the risk score after each financial update.' : 'إعادة تقييم مؤشر المخاطر بعد كل تحديث للبيانات المالية.'}</li>
                      </>
                    ) : (
                      <>
                        <li>{fr ? 'Maintain the current spending discipline.' : 'الحفاظ على الانضباط الحالي في المصاريف.'}</li>
                        <li>{fr ? 'Set aside part of available cash as a reserve.' : 'تخصيص جزء من السيولة المتاحة كاحتياطي.'}</li>
                        <li>{fr ? 'Monitor revenues and expenses monthly.' : 'متابعة الإيرادات والمصاريف شهرياً.'}</li>
                        <li>{fr ? 'Test different economic shock scenarios regularly.' : 'اختبار سيناريوهات مختلفة للصدمات الاقتصادية بانتظام.'}</li>
                      </>
                    )}
                  </ol>

                  <div className="task-tracker">
                    <div className="task-progress-heading">
                      <strong>{fr ? 'Task completion' : 'متابعة إنجاز المهام'}</strong>
                      <span>{completedCount}/4 — {progressPercent}%</span>
                    </div>
                    <div className="task-progress-track">
                      <div className="task-progress-fill" style={{ width: progressPercent + '%' }} />
                    </div>
                    <div className="task-list">
                      {actionTasks.map((task, index) => (
                        <label className="task-item" key={index}>
                          <input
                            type="checkbox"
                            checked={(completedTasks[riskClass] || []).includes(index)}
                            disabled={!activeCompany}
                            onChange={() => toggleActionTask(index, !(completedTasks[riskClass] || []).includes(index))}
                          />
                          <span>{task}</span>
                        </label>
                      ))}
                    </div>
                    <p className="task-progress-message">
                      {progressPercent === 100
                        ? (fr ? 'All tasks completed!' : 'ممتاز! كملتي جميع المهام.')
                        : (fr ? 'Keep going to complete the action plan.' : 'واصلي العمل لإكمال الخطة.')}
                    </p>
                  </div>

                  <p className="action-plan-note">{fr
                    ? 'These are indicative recommendations. Adapt them to the company actual situation.'
                    : 'هذه توصيات إرشادية، ويجب تكييفها حسب الوضعية الحقيقية للمؤسسة.'}</p>
                </div>
              </div>
            {!valid && <p>{fr ? 'Corrigez les données financières.' : 'يرجى تصحيح البيانات المالية أولاً.'}</p>}
          </section>
        )}

        {activePage === 'reports' && (
          <section className="panel print-report">
            <h2>{fr ? 'Rapport financier' : 'التقرير المالي للمؤسسة'}</h2>

            <p>{fr ? 'CashShock DZ - Rapport d’analyse financière' : 'CashShock DZ - تقرير التحليل المالي'}</p>

            <div className="report-info">
              <p><strong>{fr ? 'Entreprise :' : 'المؤسسة:'}</strong> {selectedCompany?.name || (fr ? 'Non renseignée' : 'غير محدد')}</p>
              <p><strong>{fr ? 'Activité :' : 'النشاط:'}</strong> {selectedCompany?.activity || (fr ? 'Non renseignée' : 'غير محدد')}</p>
              <p><strong>{fr ? 'Date du rapport :' : 'تاريخ التقرير:'}</strong> {new Date().toLocaleDateString(fr ? 'fr-FR' : 'ar-DZ')}</p>
            </div>

            <h3>{fr ? 'Situation financière' : 'الوضعية المالية'}</h3>
            <table className="report-table">
              <tbody>
                <tr><td>{fr ? 'Trésorerie initiale' : 'الرصيد النقدي الأولي'}</td><td>{money(c)}</td></tr>
                <tr><td>{fr ? 'Revenus' : 'الإيرادات'}</td><td>{money(r)}</td></tr>
                <tr><td>{fr ? 'Dépenses' : 'المصاريف'}</td><td>{money(e)}</td></tr>
                <tr><td>{fr ? 'Solde normal' : 'الرصيد دون صدمة'}</td><td>{money(normalBalance)}</td></tr>
              </tbody>
            </table>

            <h3>{fr ? 'Simulation du choc économique' : 'محاكاة الصدمة الاقتصادية'}</h3>
            <table className="report-table">
              <tbody>
                <tr><td>{fr ? 'Baisse des revenus' : 'انخفاض الإيرادات'}</td><td>{d}%</td></tr>
                <tr><td>{fr ? 'Hausse des dépenses' : 'ارتفاع المصاريف'}</td><td>{h}%</td></tr>
                <tr><td>{fr ? 'Revenus après choc' : 'الإيرادات بعد الصدمة'}</td><td>{money(revenueAfter)}</td></tr>
                <tr><td>{fr ? 'Dépenses après choc' : 'المصاريف بعد الصدمة'}</td><td>{money(expensesAfter)}</td></tr>
                <tr><td>{fr ? 'Solde après choc' : 'الرصيد بعد الصدمة'}</td><td>{money(shockedBalance)}</td></tr>
                <tr><td>{fr ? 'Impact financier' : 'الخسارة الناتجة عن الصدمة'}</td><td>{money(loss)}</td></tr>
              </tbody>
            </table>

            <h3>{fr ? "Financial comparison" : "المقارنة المالية"}</h3>
            <div className="report-chart">
              {chartData.map((item) => (
                <div className="report-chart-row" key={item.name}>
                  <strong className="report-chart-label">{item.name}</strong>
                  <div className="report-chart-item">
                    <span>{fr ? "Before" : "قبل الصدمة"}: {money(item.before)}</span>
                    <div className="report-bar-track"><div className="report-bar before" style={{ width: (item.before / Math.max(1, ...chartData.flatMap(entry => [entry.before, entry.after])) * 100) + "%" }} /></div>
                  </div>
                  <div className="report-chart-item">
                    <span>{fr ? "After" : "بعد الصدمة"}: {money(item.after)}</span>
                    <div className="report-bar-track"><div className="report-bar after" style={{ width: (item.after / Math.max(1, ...chartData.flatMap(entry => [entry.before, entry.after])) * 100) + "%" }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <h3>{fr ? 'Évaluation du risque' : 'تقييم المخاطر المالية'}</h3>
            <p className={`report-status ${riskClass}`}>{status}</p>

              <div className={`risk-score-box ${riskClass}`}>
                <span>{fr ? 'Financial risk score' : 'مؤشر المخاطر المالية'}</span>
                <strong>{riskScore}<small>/100</small></strong>
                <p>{status}</p>
              </div>

            <h3>{fr ? 'Recommandations' : 'التوصيات'}</h3>
            {riskClass === 'danger' ? (
              <ul>
                <li>{fr ? 'Réduire les dépenses non essentielles.' : 'تقليص المصاريف غير الضرورية.'}</li>
                <li>{fr ? 'Chercher de nouvelles sources de financement.' : 'البحث عن مصادر تمويل إضافية.'}</li>
                <li>{fr ? 'Améliorer le recouvrement des créances.' : 'تسريع تحصيل مستحقات المؤسسة.'}</li>
              </ul>
            ) : riskClass === 'warning' ? (
              <ul>
                <li>{fr ? 'Surveiller les dépenses régulièrement.' : 'مراقبة المصاريف بانتظام.'}</li>
                <li>{fr ? 'Éviter les dépenses non prioritaires.' : 'تجنب النفقات غير الضرورية.'}</li>
                <li>{fr ? 'Prévoir une réserve de trésorerie.' : 'تكوين احتياطي نقدي للطوارئ.'}</li>
              </ul>
            ) : (
              <ul>
                <li>{fr ? 'Maintenir un bon équilibre financier.' : 'الحفاظ على التوازن المالي.'}</li>
                <li>{fr ? 'Continuer à suivre les flux de trésorerie.' : 'مواصلة متابعة التدفقات النقدية.'}</li>
                <li>{fr ? 'Préparer une réserve pour les imprévus.' : 'تخصيص احتياطي للطوارئ.'}</li>
              </ul>
            )}

            {(!activeCompany || !valid) && (
              <p>{fr ? 'Sélectionnez une entreprise et vérifiez les données avant l’impression.' : 'اختاري مؤسسة وتأكدي من صحة البيانات قبل طباعة التقرير.'}</p>
            )}

            <button className="report-print-btn" disabled={!activeCompany || !valid} onClick={() => window.print()}>
              {fr ? 'Imprimer / Enregistrer en PDF' : 'طباعة / حفظ التقرير PDF'}
            </button>
          </section>
        )}

        {/* PAGE_SEPARATION_DONE */}
        <footer>
          CashShock DZ © 2026
          <p>{fr
            ? 'Outil de simulation financière'
            : 'أداة لمحاكاة الوضعية المالية للمؤسسات'}
          </p>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
0
