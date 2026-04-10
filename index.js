require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();

const createDefaultAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Admin',
        email: 'admin@remind.com',
        password: hashedPassword,
        role: 'admin',
        department: 'Management',
        isActive: true,
      });
      console.log('Default admin created: admin@remind.com / admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
};

connectDB().then(async () => {
  await createDefaultAdmin();
});

app.use(cors({
  origin: ['https://web-1bsqoagfu-limeonssz-9484s-projects.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/orientation', require('./routes/orientation'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
