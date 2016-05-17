/*
 * *****************************************************************************
 * Copyright (c) 2013-2014 CriativaSoft (www.criativasoft.com.br)
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Ricardo JL Rufino - Initial API and Implementation
 * *****************************************************************************
 */
package br.com.criativasoft.opendevice.mqtt;

import io.moquette.BrokerConstants;
import io.moquette.server.config.IConfig;
import io.moquette.spi.security.ISslContextCreator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import java.io.*;
import java.net.URL;
import java.security.*;
import java.security.cert.CertificateException;

/**
 * Moquette server implementation to load SSL certificate from local filesystem path
 * configured in config file.
 *
 * Created by andrea on 13/12/15.
 */
class DefaultMoquetteSslContextCreator implements ISslContextCreator {

    private static final Logger LOG = LoggerFactory.getLogger(DefaultMoquetteSslContextCreator.class);

    private IConfig props;

    public DefaultMoquetteSslContextCreator(IConfig props) {
        this.props = props;
    }

    @Override
    public SSLContext initSSLContext() {
        final String jksPath = props.getProperty(BrokerConstants.JKS_PATH_PROPERTY_NAME);
        LOG.info("Starting SSL using keystore at {}", jksPath);
        if (jksPath == null || jksPath.isEmpty()) {
            //key_store_password or key_manager_password are empty
            LOG.warn("You have configured the SSL port but not the jks_path, SSL not started");
            return null;
        }

        //if we have the port also the jks then keyStorePassword and keyManagerPassword
        //has to be defined
        final String keyStorePassword = props.getProperty(BrokerConstants.KEY_STORE_PASSWORD_PROPERTY_NAME);
        final String keyManagerPassword = props.getProperty(BrokerConstants.KEY_MANAGER_PASSWORD_PROPERTY_NAME);
        if (keyStorePassword == null || keyStorePassword.isEmpty()) {
            //key_store_password or key_manager_password are empty
            LOG.warn("You have configured the SSL port but not the key_store_password, SSL not started");
            return null;
        }
        if (keyManagerPassword == null || keyManagerPassword.isEmpty()) {
            //key_manager_password or key_manager_password are empty
            LOG.warn("You have configured the SSL port but not the key_manager_password, SSL not started");
            return null;
        }

        try {
            InputStream jksInputStream = jksDatastore(jksPath);
            SSLContext serverContext = SSLContext.getInstance("TLS");
            final KeyStore ks = KeyStore.getInstance("JKS");
            ks.load(jksInputStream, keyStorePassword.toCharArray());
            final KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, keyManagerPassword.toCharArray());
            serverContext.init(kmf.getKeyManagers(), null, null);
            return serverContext;
        } catch (NoSuchAlgorithmException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        } catch (UnrecoverableKeyException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        } catch (CertificateException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        } catch (KeyStoreException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        } catch (KeyManagementException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        } catch (IOException ex) {
            LOG.error("Can't start SSL layer!", ex);
            return null;
        }
    }

    private InputStream jksDatastore(String jksPath) throws FileNotFoundException {
        URL jksUrl = getClass().getClassLoader().getResource(jksPath);
        if (jksUrl != null) {
            LOG.info("Starting with jks at {}, jks normal {}", jksUrl.toExternalForm(), jksUrl);
            return getClass().getClassLoader().getResourceAsStream(jksPath);
        }
        LOG.info("jks not found in bundled resources, try on the filesystem");
        File jksFile = new File(jksPath);
        if (jksFile.exists()) {
            LOG.info("Using {} ", jksFile.getAbsolutePath());
            return new FileInputStream(jksFile);
        }
        LOG.warn("File {} doesn't exists", jksFile.getAbsolutePath());
        return null;
    }
}
