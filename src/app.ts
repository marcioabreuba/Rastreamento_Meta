/**
 * Arquivo principal da aplicação
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import routes from './routes';
import path from 'path';
import { httpLogger } from './middleware/loggerMiddleware';

// Inicializar aplicação Express
const app = express();

// Configurar para preferir IPv4
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(httpLogger);

// Configurar rotas PRIMEIRO
app.use('/', routes);

// Servir arquivos estáticos da pasta public DEPOIS
// Se nenhuma rota customizada corresponder, tenta servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Exportar a aplicação configurada
export { app }; 