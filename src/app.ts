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

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Configurar rotas
app.use('/', routes);

// Exportar a aplicação configurada
export { app }; 