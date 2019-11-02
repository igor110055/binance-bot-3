require('dotenv').config();
const {getUsers, updateUser} = require('./database');
const axios = require('axios');

setInterval(()=>{
  updateUserInfo();
},10000);

function updateUserInfo(){
  getUsers().then(users=>{
    for(let user of users){
      let url = `http://${user.serverIP}:${user.port}/uptime`;
      let apiKey = user.apiKey;
      axios.get(url).then(res=>{
          let uptime = res.data.data.result;
          updateUser(apiKey, { status: 1, uptime: uptime }).then(result=>{
            // console.log(result);
          });
      }).catch(err=>{
        updateUser(apiKey, { status: 0 }).then(result=>{
          // console.log(result);
        });
      })
    }
  }).catch(error=>{
    console.log(error);
  });
}