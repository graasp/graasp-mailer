import fastify, { FastifyPluginAsync } from 'fastify';
import { Server } from 'http';
import { MailerOptions } from '../src';

const DEFAULT_OPTIONS = {
  host: 'host',
  username: 'username',
  password: 'password',
  fromEmail: 'fromEmail',
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
async function build({
  plugin,
  options,
}: {
  plugin: FastifyPluginAsync<MailerOptions, Server>;
  options?: MailerOptions;
}) {
  const app = fastify();

  await app.register(plugin, options ?? DEFAULT_OPTIONS);

  return app;
}
export default build;
