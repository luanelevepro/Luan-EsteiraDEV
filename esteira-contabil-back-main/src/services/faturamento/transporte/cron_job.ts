import cron from 'node-cron';
import email_processorService from './email_processor.service';

export const startCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // Verificar se extração de email está habilitada
  const emailExtractionEnabled = process.env.RUN_EXTRACAO_EMAIL !== 'false';

  if (!emailExtractionEnabled) {
    console.log('⚠️  Email extraction is DISABLED (RUN_EXTRACAO_EMAIL=false)');
    return;
  }

  cron.schedule('*/2 * * * *', async () => {
    try {
      await email_processorService.processUnreadEmails();
    } catch (error: any) {
      console.error('Cron job error:', error.message);
    }
  });

  console.log('✅ Cron job scheduled: Email processing every 2 minutes');

  // Optional: Run immediately on startup
  if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('🚀 Running initial email processing...');
    setTimeout(async () => {
      try {
        await email_processorService.processUnreadEmails();
      } catch (error: any) {
        console.error('Initial run error:', error.message);
      }
    }, 5000); // Wait 5 seconds after startup
  }
};
