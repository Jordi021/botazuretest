import { Telegraf } from 'telegraf';
import { AzureOpenAI } from 'openai';
import 'dotenv/config'; // Importa dotenv/config para cargar las variables de entorno

// --- Configuración desde Variables de Entorno ---
const botToken = process.env.BOT_TOKEN;
const azureOpenAIApiKey = process.env.AZURE_OPENAI_API_KEY;
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureOpenAIDeploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const azureOpenAIApiVersion = process.env.AZURE_OPENAI_API_VERSION;

// --- Verificación de Variables de Entorno ---
if (!botToken || !azureOpenAIApiKey || !azureOpenAIEndpoint || !azureOpenAIDeploymentName || !azureOpenAIApiVersion) {
    console.error('Error: Una o más variables de entorno para Telegram o Azure OpenAI no están configuradas.');
    console.error('Asegúrate de tener un archivo .env con BOT_TOKEN, AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME, AZURE_OPENAI_API_VERSION.');
    process.exit(1); // Sale de la aplicación si faltan variables críticas
}

// --- Inicialización del Bot de Telegram ---
const bot = new Telegraf(botToken);

// --- Inicialización del Cliente de Azure OpenAI ---
const openaiClient = new AzureOpenAI({
    endpoint: azureOpenAIEndpoint,
    apiKey: azureOpenAIApiKey,
    deployment: azureOpenAIDeploymentName,
    apiVersion: azureOpenAIApiVersion
});

// --- Lógica del Chatbot ---

// Manejador del comando /start
bot.start((ctx) => {
    ctx.reply('¡Hola! Soy tu asistente de información sobre Azure, impulsado por GPT-4o. ¿En qué puedo ayudarte hoy?');
});

// Manejador del comando /help
bot.help((ctx) => {
    ctx.reply('Puedes preguntarme sobre servicios de Azure, computación en la nube o cualquier tema relacionado. ¡Inténtalo!');
});

// Manejador principal para todos los mensajes de texto
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    console.log(`Mensaje recibido de ${ctx.from.first_name} (${ctx.from.id}): "${userMessage}"`);

    try {
        // Llama a Azure OpenAI para obtener una respuesta
        const response = await openaiClient.chat.completions.create({
            messages: [
                // Este es el "system message" donde defines la personalidad y el rol de tu bot.
                // Aquí puedes personalizarlo para que actúe como tu "agente" de información de Azure.
                { role: "system", content: "Eres un asistente de IA muy útil y amable especializado en proporcionar información concisa y precisa sobre los servicios de Microsoft Azure. Responde siempre en español. Si no conoces la respuesta, indícalo claramente. No inventes información." },
                { role: "user", content: userMessage }
            ],
            model: azureOpenAIDeploymentName, // Usa el nombre de tu despliegue
            max_tokens: 1000, // Limita la longitud de la respuesta para evitar respuestas muy largas
            temperature: 0.7, // Controla la creatividad (0.0 para respuestas más deterministas, 1.0 para más creativas)
            top_p: 0.95 // Controla la diversidad de la respuesta
        });

        // Verifica la respuesta y envía el contenido al usuario de Telegram
        if (response?.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
            const botResponse = response.choices[0].message.content;
            await ctx.reply(botResponse);
        } else {
            console.warn('Respuesta inesperada de Azure OpenAI:', response);
            await ctx.reply('Lo siento, el modelo de IA no proporcionó una respuesta válida. Inténtalo de nuevo.');
        }

    } catch (error) {
        console.error('Error al comunicarse con Azure OpenAI:', error);
        // Puedes añadir más detalles del error si es un error HTTP de Axios (error.response.data)
        await ctx.reply('Lo siento, no puedo procesar tu solicitud en este momento debido a un problema con el servicio de IA. Por favor, inténtalo más tarde.');
    }
});

// Manejo de errores generales del bot de Telegraf
bot.catch((err, ctx) => {
    console.error(`Error de Telegraf para ${ctx.updateType} en el chat ${ctx.chat.id}:`, err);
    // Evita enviar un mensaje de error si el contexto no lo permite (ej. error de conexión inicial)
    if (ctx.reply) {
        ctx.reply('Se ha producido un error inesperado en el bot. Por favor, inténtalo de nuevo más tarde.');
    }
});

// Inicia el bot de Telegram
bot.launch()
    .then(() => {
        console.log('Bot de Telegram conectado a Azure OpenAI (GPT-4o) iniciado y escuchando mensajes...');
    })
    .catch((err) => {
        console.error('Error al iniciar el bot de Telegram:', err);
    });

// Habilita la detención elegante en caso de interrupción (Ctrl+C)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));