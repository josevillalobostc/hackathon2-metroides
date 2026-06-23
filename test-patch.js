import axios from 'axios';

async function test() {
  try {
    const token = await axios.post('https://hackaton-20261-front-587720740455.us-east1.run.app/api/v1/auth/login', {
      teamCode: "TEAM-057",
      email: "operator@tuckersoft.com",
      password: "Pizza-TEAM-057"
    }).then(r => r.data.token);

    const feed = await axios.get('https://hackaton-20261-front-587720740455.us-east1.run.app/api/v1/signals/feed?limit=15', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const signal = feed.data.items.find(s => s.status === 'RECIBIDA');
    if (!signal) {
      console.log('No RECIBIDA signal found');
      return;
    }
    console.log('Testing PATCH on', signal.id);
    const res = await axios.patch(`https://hackaton-20261-front-587720740455.us-east1.run.app/api/v1/signals/${signal.id}/status`, {
      status: 'PROCESANDO'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('HTTP Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Other Error:', err.message);
    }
  }
}
test();
