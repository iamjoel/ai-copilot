import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxy = new ProxyAgent('http://127.0.0.1:7890'); // 换成上一步看到的代理地址
setGlobalDispatcher(proxy);


// const res = await fetch('https://ifconfig.me/ip');
// console.log(await res.text());
// should the same to 
// 1. curl -v https://ifconfig.me/ip
// 2. browser visit https://ifconfig.me/ip
