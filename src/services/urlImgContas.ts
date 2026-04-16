import { API_IMG_ROOT } from "./apiConfig";

// Base das imagens de CONTAS (contas_receber/contas_pagar)
// O upload de contas agora usa '../img/contas/' em relação às pastas apiReforlimer/receber e apiReforlimer/pagar,
// ou seja, grava em C:\xampp\htdocs\apiReforlimer\img\contas e a URL HTTP fica /apiReforlimer/img/contas/NOME_ARQUIVO.
const urlImgContas = API_IMG_ROOT;

export default urlImgContas;
