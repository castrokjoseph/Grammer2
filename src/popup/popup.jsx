// --- React and Material-UI Imports ---
const { useState, useEffect } = React;
const {
  Box, Tab, Tabs, Typography, Switch, FormControlLabel, RadioGroup, Radio, FormControl, InputLabel, Select, MenuItem,
  Button, List, ListItem, ListItemText, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Alert, CircularProgress, Paper
} = MaterialUI;

// --- Helper Components & Constants ---

/**
 * A helper component to render the content of a single tab panel.
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}><Typography component={'span'}>{children}</Typography></Box>}
    </div>
  );
}

/**
 * Generates accessibility properties for a tab.
 */
function a11yProps(index) { return { id: `tab-${index}`, 'aria-controls': `tabpanel-${index}` }; }

const emptyTemplate = { name: '', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: '' };
const defaultStats = { totalApiHits: 0, wordCountCorrected: 0, grammarIssuesFixed: 0, typosFixed: 0, rephrasingsApplied: 0 };


// --- Main App Component ---

function App() {
  // --- State Management ---
  const [tabValue, setTabValue] = useState(0);

  // Home Tab State
  const [isEnabled, setIsEnabled] = useState(true);
  const [mode, setMode] = useState('on-demand');
  const [currentTemplateId, setCurrentTemplateId] = useState('');

  // Templates Tab State
  const [templates, setTemplates] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Test API Tab State
  const [templateToTest, setTemplateToTest] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Stats Tab State
  const [stats, setStats] = useState(defaultStats);

  // --- Effects for Chrome Storage ---

  // Effect to load all settings and stats from storage on initial component mount.
  useEffect(() => {
    // Load synced settings (across devices)
    chrome.storage.sync.get(['isEnabled', 'mode', 'currentTemplateId', 'templates'], (res) => {
      if (chrome.runtime.lastError) { console.error("Error loading sync settings:", chrome.runtime.lastError); return; }
      setIsEnabled(res.isEnabled !== undefined ? res.isEnabled : true);
      setMode(res.mode || 'on-demand');
      const storedTmpl = res.templates && res.templates.length > 0 ? res.templates : [{ ...emptyTemplate, id: 'default-openai', name: 'OpenAI (Default)' }];
      setTemplates(storedTmpl);
      const activeId = res.currentTemplateId || storedTmpl[0].id;
      setCurrentTemplateId(activeId);
      setTemplateToTest(storedTmpl.some(t => t.id === activeId) ? activeId : (storedTmpl[0]?.id || ''));
    });
    // Load local stats (device-specific)
    chrome.storage.local.get({ stats: defaultStats }, (res) => {
      if (chrome.runtime.lastError) { console.error("Error loading local stats:", chrome.runtime.lastError); return; }
      setStats(res.stats);
    });
    // Listen for storage changes to keep UI in sync
    const listener = (changes, area) => {
      if (area === 'local' && changes.stats) setStats(changes.stats.newValue);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener); // Cleanup listener
  }, []);

  // Effect to save synced settings whenever they change.
  useEffect(() => {
    chrome.storage.sync.set({ isEnabled, mode, currentTemplateId, templates });
  }, [isEnabled, mode, currentTemplateId, templates]);

  // --- Event Handlers ---

  const handleTabChange = (e, v) => setTabValue(v);

  // Template CRUD handlers
  const handleOpenDialog = (t = null) => { setEditingTemplate(t ? { ...t } : { ...emptyTemplate }); setIsDialogOpen(true); };
  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingTemplate(null); };
  const handleSaveTemplate = () => {
    if (!editingTemplate?.name) { alert('Template name is required.'); return; }
    if (editingTemplate.id) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    } else {
      setTemplates([...templates, { ...editingTemplate, id: `template-${Date.now()}` }]);
    }
    handleCloseDialog();
  };
  const handleDeleteTemplate = (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    const newTmpls = templates.filter(t => t.id !== id);
    setTemplates(newTmpls);
    if (currentTemplateId === id) {
      const newId = newTmpls[0]?.id || '';
      setCurrentTemplateId(newId);
      setTemplateToTest(newId);
    }
  };
  const handleFormChange = (e) => setEditingTemplate(p => ({ ...p, [e.target.name]: e.target.value }));

  // API Test handler
  const handleTestConnection = () => {
    if (!templateToTest) { setTestResult({ severity: 'warning', message: 'Please select a template to test.' }); return; }
    setIsTesting(true); setTestResult(null);
    const tmpl = templates.find(t => t.id === templateToTest);
    chrome.runtime.sendMessage({ type: 'TEST_API', template: tmpl }, (res) => {
      setIsTesting(false);
      if (chrome.runtime.lastError) { setTestResult({ severity: 'error', message: chrome.runtime.lastError.message }); return; }
      setTestResult(res);
    });
  };

  // Stats handler
  const handleClearStats = () => {
    if (!window.confirm('Are you sure you want to clear all statistics? This cannot be undone.')) return;
    chrome.storage.local.set({ stats: defaultStats }, () => setStats(defaultStats));
  };

  // --- Render Method ---
  return (
    <Box sx={{ width: '400px', typography: 'body1', minHeight: '350px' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Settings" variant="scrollable" scrollButtons="auto">
          <Tab label="Home" {...a11yProps(0)} />
          <Tab label="Templates" {...a11yProps(1)} />
          <Tab label="Test API" {...a11yProps(2)} />
          <Tab label="Stats" {...a11yProps(3)} />
        </Tabs>
      </Box>

      {/* Home Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
          <FormControlLabel control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />} label="Enable Extension" />
          <FormControl component="fieldset">
            <Typography component="legend" variant="body2">Mode</Typography>
            <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value)}>
              <FormControlLabel value="on-demand" control={<Radio />} label="On-Demand" />
              <FormControlLabel value="automatic" control={<Radio />} label="Automatic" />
            </RadioGroup>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Active Template</InputLabel>
            <Select value={currentTemplateId} label="Active Template" onChange={(e) => setCurrentTemplateId(e.target.value)}>
              {templates.map((t) => (<MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>))}
            </Select>
          </FormControl>
        </Box>
      </TabPanel>

      {/* Templates Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button variant="contained" onClick={() => handleOpenDialog()}>Add New Template</Button>
          <List>
            {templates.map((t) => (
              <ListItem key={t.id} secondaryAction={
                <Box>
                  <IconButton onClick={() => handleOpenDialog(t)} aria-label="edit">E</IconButton>
                  <IconButton onClick={() => handleDeleteTemplate(t.id)} aria-label="delete">X</IconButton>
                </Box>
              }>
                <ListItemText primary={t.name} secondary={t.provider} />
              </ListItem>
            ))}
          </List>
        </Box>
      </TabPanel>

      {/* Test API Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6">Test API Connection</Typography>
          <FormControl fullWidth>
            <InputLabel>Select Template</InputLabel>
            <Select value={templateToTest} label="Select Template" onChange={(e) => setTemplateToTest(e.target.value)}>
              {templates.map((t) => (<MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>))}
            </Select>
          </FormControl>
          <Box sx={{ position: 'relative' }}>
            <Button variant="contained" onClick={handleTestConnection} disabled={isTesting || !templateToTest}>Test Connection</Button>
            {isTesting && <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />}
          </Box>
          {testResult && <Alert severity={testResult.severity}>{testResult.message}</Alert>}
        </Box>
      </TabPanel>

      {/* Stats Tab */}
      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Usage Statistics</Typography>
          <List dense>
            <ListItem><ListItemText primary="Total API Hits" secondary={stats.totalApiHits} /></ListItem>
            <ListItem><ListItemText primary="Words Corrected" secondary={stats.wordCountCorrected} /></ListItem>
            <ListItem><ListItemText primary="Grammar Issues Fixed" secondary={stats.grammarIssuesFixed} /></ListItem>
            <ListItem><ListItemText primary="Typos Fixed" secondary={stats.typosFixed} /></ListItem>
            <ListItem><ListItemText primary="Rephrasings Applied" secondary={stats.rephrasingsApplied} /></ListItem>
          </List>
          <Button variant="outlined" color="error" size="small" onClick={handleClearStats} sx={{ mt: 2 }}>Clear Stats</Button>
        </Paper>
      </TabPanel>

      {/* Add/Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
          <DialogTitle>{editingTemplate.id ? 'Edit Template' : 'Add New Template'}</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" name="name" label="Template Name" type="text" fullWidth variant="standard" value={editingTemplate.name} onChange={handleFormChange} />
            <FormControl fullWidth margin="dense">
              <InputLabel>Provider</InputLabel>
              <Select name="provider" value={editingTemplate.provider} onChange={handleFormChange}>
                <MenuItem value="OpenAI">OpenAI</MenuItem><MenuItem value="Claude">Claude</MenuItem><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField margin="dense" name="endpoint" label="API Endpoint URL" type="text" fullWidth variant="standard" value={editingTemplate.endpoint} onChange={handleFormChange} />
            <TextField margin="dense" name="apiKey" label="API Key" type="password" fullWidth variant="standard" value={editingTemplate.apiKey} onChange={handleFormChange} />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// --- App Initialization ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
