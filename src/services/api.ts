import axios from "axios";

export default axios.create({
  // Ajuste o IP se precisar; a porta 8080 é a do XAMPP
  baseURL: "http://192.168.1.113:8080/apiReforlimer", // pasta real da API PHP
  timeout: 15000,
});


