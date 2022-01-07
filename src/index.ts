import { promisify } from 'util';

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import pointOfView from 'point-of-view';
import * as eta from 'eta';
import fastifyPolyglot from 'fastify-polyglot';

import { Member } from 'graasp';

const DEFAULT_LANG = 'en';

declare module 'fastify' {
  interface FastifyInstance {
    // remove once fastify-nodemailer has types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodemailer: any;
    // remove once point-of-view has the types fixed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any;
    // remove once fastify-polyglot has types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    i18n: any;
    mailer: {
      sendRegisterEmail: (member: Member, link: string) => Promise<void>;
      sendLoginEmail: (
        member: Member,
        link: string,
        reRegistrationAttempt?: boolean,
      ) => Promise<void>;
    };
  }
}

interface MailerOptions {
  host: string;
  username: string;
  password: string;
  fromEmail: string;
}

const plugin: FastifyPluginAsync<MailerOptions> = async (fastify, options) => {
  const { host, username: user, password: pass, fromEmail } = options;

  fastify.register(pointOfView, { engine: { eta } });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await fastify.register(require('fastify-nodemailer'), {
    host,
    auth: { user, pass },
    pool: true,
    port: 465,
    secure: true,
  });

  fastify.register(fastifyPolyglot, {
    defaultLocale: DEFAULT_LANG,
    localesPath: './lang',
    debug: process.env.NODE_ENV !== 'production',
  });

  const promisifiedNodemailerSendMail =
    // sendMail() uses 'this' internally and 'promisify' breaks that, so it needs to be passed
    promisify(fastify.nodemailer.sendMail.bind(fastify.nodemailer));

  async function sendMail(from: string, to: string, subject: string, text: string, html?: string) {
    // TODO: does it make sense to return the return value of nodemailer?
    await promisifiedNodemailerSendMail({ from, to, subject, text, html });
  }

  const modulePath = module.path;

  // Login
  async function sendLoginEmail(
    member: { email: string; name: string },
    link: string,
    reRegistrationAttempt = false,
    lang = DEFAULT_LANG,
  ) {
    const translated = await fastify.i18n.changeLanguage(lang);
    const html = await fastify.view(`${modulePath}/templates/login.eta`, {
      member,
      link,
      reRegistrationAttempt,
      translated,
    });
    await sendMail(fromEmail, member.email, 'Sign in', link, html);
  }

  // Register
  async function sendRegisterEmail(
    member: { email: string; name: string },
    link: string,
    lang = DEFAULT_LANG,
  ) {
    const translated = await fastify.i18n.changeLanguage(lang);
    const html = await fastify.view(`${modulePath}/templates/register.eta`, {
      member,
      link,
      translated,
    });
    await sendMail(fromEmail, member.email, 'Register', link, html);
  }

  fastify.decorate('mailer', {
    sendLoginEmail,
    sendRegisterEmail,
  });
};

export default fp(plugin, {
  fastify: '3.x',
  name: 'graasp-mailer',
});
