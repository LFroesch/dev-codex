const mongoose = require('mongoose');

// Connect to your database
mongoose.connect('mongodb://localhost:27017/dev-codex', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define the schema exactly as it is in your project
const Schema = mongoose.Schema;

const deploymentSchema = new Schema({
  liveUrl: { type: String, default: '' },
  githubRepo: { type: String, default: '' },
  deploymentPlatform: { type: String, default: '' },
  deploymentStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'error'],
    default: 'inactive'
  },
  buildCommand: { type: String, default: '' },
  startCommand: { type: String, default: '' },
  lastDeployDate: { type: Date },
  deploymentBranch: { type: String, default: 'main' },
  environmentVariables: [{
    key: { type: String, required: false, default: '' },
    value: { type: String, required: false, default: '' }
  }],
  notes: { type: String, default: '' }
});

const TestProject = mongoose.model('Project', new Schema({
  name: String,
  description: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  deploymentData: {
    type: deploymentSchema,
    default: () => ({})
  }
}, { timestamps: true }));

async function testDeploymentUpdate() {
  try {
    console.log('🔍 Testing deployment data update...');
    
    // Find your project (replace with your actual project ID)
    const projectId = '68682dacc102669f5f649937';
    
    const testData = {
      deploymentData: {
        liveUrl: 'https://test-from-script.com',
        githubRepo: 'https://github.com/test/repo',
        deploymentPlatform: 'Vercel',
        deploymentStatus: 'active',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        deploymentBranch: 'main',
        environmentVariables: [],
        notes: 'Test from script'
      }
    };
    
    console.log('📝 Updating with data:', JSON.stringify(testData, null, 2));
    
    const result = await TestProject.findByIdAndUpdate(
      projectId,
      testData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Update result:', result?.deploymentData);
    
    // Now read it back
    const readBack = await TestProject.findById(projectId);
    console.log('📖 Read back deployment data:', readBack?.deploymentData);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testDeploymentUpdate();