import axios from 'axios';

async function test() {
  axios.interceptors.request.use(req => {
    console.log(req.headers);
    return req;
  });
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
    await axios.patch(`https://hackaton-20261-front-587720740455.us-east1.run.app/api/v1/signals/${signal.id}/status`, {
      status: 'PROCESANDO'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {}
}
test();
