// Test data for the share feature
const testResult = {
  score: 13,
  maxScore: 15,
  percentage: 86.7,
  timeTaken: 398, // 6 minutes 38 seconds
  completedAt: '2025-07-11T10:30:00Z',
  quiz: {
    title: 'Antihistamines Quiz',
    courseCode: 'PCL 312',
    courseTitle: 'Pharmacology',
    topic: 'Antihistamines'
  }
};

console.log('Test Share Text:');
const getScoreMessage = (percentage) => {
  if (percentage >= 90) return '🔥 Outstanding Performance!';
  if (percentage >= 80) return '🔥 Distinction Level!';
  if (percentage >= 70) return '✅ Great Job!';
  if (percentage >= 60) return '⚠️ You\'re almost there!';
  if (percentage >= 50) return '📚 Keep studying!';
  return '💪 Don\'t give up!';
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
};

const getShareText = () => {
  const timeText = testResult.timeTaken ? ` in ${formatTime(testResult.timeTaken)}` : '';
  return `${testResult.score}/${testResult.maxScore} in ${testResult.quiz.courseCode} – thanks to PANSGPT! 🎯\n\n${getScoreMessage(testResult.percentage)}\n\nYou know the best thing to do 📚`;
};

console.log(getShareText());
console.log('\nExpected output:');
console.log('13/15 in PCL 312 – thanks to PANSGPT! 🎯');
console.log('');
console.log('🔥 Distinction Level!');
console.log('');
console.log('You know the best thing to do 📚'); 