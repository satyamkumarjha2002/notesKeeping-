// Simple script to guide the user through setting up CORS for Firebase Storage

console.log('====== Firebase Storage CORS Configuration Guide ======');
console.log('Follow these steps to fix CORS issues with Firebase Storage:');
console.log('\n1. Login to Firebase (if not already logged in):');
console.log('   firebase login');
console.log('\n2. Set the CORS configuration for your storage bucket:');
console.log('   firebase storage:cors set firebase-config/cors.json --project=noteskeeping-30144');
console.log('\n3. Verify the CORS settings were applied:');
console.log('   firebase storage:cors get --project=noteskeeping-30144');
console.log('\nFor detailed information, visit: https://firebase.google.com/docs/storage/web/download-files#cors_configuration');
console.log('\n====== End of Guide ======'); 