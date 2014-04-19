# How to generate ExtJS 5 project with Sencha Cmd 5

At the moment [Sencha ExtJS 5 Beta](http://www.sencha.com/blog/announcing-public-beta-of-ext-js-5/) is out.

1. Download Sencha Cmd 5 as described in the announcement.
2. Generate new ExtJS 5 application:

    $ sencha generate app -ext MyApp src/main/application

I don't recommend to add "ext" directory to the Git repository.

# How to build ExtJS project with Maven

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
                    <executable>${env.SENCHA_CMD}</executable>
                    <arguments>
                        <argument>-sdk</argument>
                        <argument>${basedir}/src/main/application</argument>
                        <argument>app</argument>
                        <argument>build</argument>
                        <argument>--clean</argument>
                        <argument>--environment</argument>
                        <argument>${sencha.env}</argument>
                    </arguments>
                </configuration>
            </execution>
        </executions>
    </plugin>

And run:

    $ export SENCHA_CMD="/path/to/your/Sencha/Cmd/5.0.0.116/sencha"
    $ mvn compile

If you want to make SENCHA_CMD permanent then add it to your `/etc/profile` or `~/.bashrc` file.

Note: `${sencha.env}` determines your current maven profile: development or production. Take a look at `pom.xml`.
Your compiled ExtJS project will be located at `src/main/application/build/production`. You may change it to any other location.

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
                    <directory>src/main/application/build/${sencha.env}/MyApp</directory>
                    <excludes>
                        <exclude>**/Readme.md</exclude>
                    </excludes>
                </resource>
            </webResources>
        </configuration>
    </plugin>

Now you have fully funtional Java web application.