# How to generate ExtJS 5 project with Sencha Cmd 5

At the moment [Sencha ExtJS 5 Beta](http://www.sencha.com/blog/announcing-public-beta-of-ext-js-5/) is out.

1. Download Sencha Cmd 5 as described in the announcement.
2. Generate new ExtJS 5 application:


    $ sencha generate app -ext MyApp src/main/webapp

# How to compile ExtJS project

In order to compile your project from Maven use `exec-maven-plugin`:

    <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>1.2.1</version>
        <executions>
            <execution>
                <id>sencha-compile</id>
                <phase>compile</phase>
                <goals>
                    <goal>exec</goal>
                </goals>
                <configuration>
                    <!-- Set path to your Sencha Cmd executable-->
                    <executable>../Sencha/Cmd/5.0.0.116/sencha</executable>
                    <arguments>
                        <argument>-sdk</argument>
                        <argument>${basedir}/src/main/webapp</argument>
                        <argument>app</argument>
                        <argument>build</argument>
                        <argument>--clean</argument>
                        <argument>--environment</argument>
                        <argument>${sencha.env}</argument>
                        <argument>--destination</argument>
                        <argument>${basedir}/src/main/webapp/build</argument>
                    </arguments>
                </configuration>
            </execution>
        </executions>
    </plugin>

And run:

    $ mvn compile

Note: `${sencha.env}` determines your current maven profile: development or production. Take a look at `pom.xml`.
Your compiled ExtJS project will be located at `src/main/webapp/build/production`. You may change it to any other location.

# How to build WAR

Use `maven-war-plugin` to package WAR file.

    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-war-plugin</artifactId>
        <version>2.4</version>
        <configuration>
            <failOnMissingWebXml>false</failOnMissingWebXml>
            <webResources>
                <resource>
                    <directory>src/main/webapp/build/${sencha.env}/MyApp</directory>
                    <excludes>
                        <exclude>**/Readme.md</exclude>
                    </excludes>
                </resource>
            </webResources>
            <packagingExcludes>.sencha/**,app/**,build/**,ext/**,overrides/**,packages/**,sass/**,bootstrap.css,bootstrap.js,bootstrap.json,build.xml,Readme.md</packagingExcludes>
        </configuration>
    </plugin>

Now you have fully funtional Java web application.