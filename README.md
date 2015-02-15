# How to generate ExtJS 5 project with Sencha Cmd 5

At the moment [Sencha Cmd 5.1](http://docs.sencha.com/extjs/5.1/getting_started/getting_started.html) is out.

1. Download and install Sencha Cmd 5.1 as described in getting started. Also take a look at the [Cmd 5.x docs](http://docs.sencha.com/cmd/5.x/intro_to_cmd.html).
2. Generate new ExtJS 5.1 application:

    $ sencha generate app -ext MyApp src/main/application

I don't recommend to add "ext" directory with all ExtJS framework files to our Git repository.

# How to build ExtJS project with Maven

In order to compile your project from Maven use `exec-maven-plugin`:

    <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>1.3.2</version>
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
                    <workingDirectory>${project.basedir}/src/main/application</workingDirectory>
                    <arguments>
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

# IntelliJ Idea + JRebel + Web module debugging

1. Create new artifact and add `src/main/application` folder to it instead of `src/main/application/build/testing/MyApp`
2. Configure web server to deploy your newly created artifact.
3. In `rebel.xml` change root web folder to `src/main/application`:


	<web>
		<link target="/">
			<dir name="/home/user/IdeaProjects/sencha-extjs-maven/src/main/application">
			</dir>
		</link>
	</web>